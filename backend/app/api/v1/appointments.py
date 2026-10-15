from datetime import datetime, date as date_type, time, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_patient, require_staff
from app.models.user import User, UserRole
from app.models.profile import PatientProfile, DoctorProfile
from app.models.service import Service
from app.models.appointment import Appointment, AppointmentEvent, AppointmentStatus
from app.schemas.appointment import (
    CreateAppointmentRequest,
    UpdateStatusRequest,
    CancelRequest,
    RescheduleRequest,
    AppointmentDetailResponse,
    AppointmentEventResponse,
    AppointmentListResponse,
)
from app.services.notification_service import notification_service
from app.models.notification import NotificationChannel

router = APIRouter()

# Valid lifecycle state transitions map
VALID_TRANSITIONS = {
    AppointmentStatus.PENDING_REVIEW.value: [
        AppointmentStatus.CONFIRMED.value,
        AppointmentStatus.CANCELLED.value,
        AppointmentStatus.RESCHEDULE_PROPOSED.value,
    ],
    AppointmentStatus.RESCHEDULE_PROPOSED.value: [
        AppointmentStatus.CONFIRMED.value,
        AppointmentStatus.CANCELLED.value,
    ],
    AppointmentStatus.CONFIRMED.value: [
        AppointmentStatus.CHECKED_IN.value,
        AppointmentStatus.CANCELLATION_REQUESTED.value,
        AppointmentStatus.CANCELLED.value,
        AppointmentStatus.NO_SHOW.value,
    ],
    AppointmentStatus.CANCELLATION_REQUESTED.value: [
        AppointmentStatus.CANCELLED.value,
        AppointmentStatus.CONFIRMED.value,
    ],
    AppointmentStatus.CHECKED_IN.value: [
        AppointmentStatus.COMPLETED.value,
        AppointmentStatus.CANCELLED.value,
    ],
    AppointmentStatus.COMPLETED.value: [],
    AppointmentStatus.CANCELLED.value: [],
    AppointmentStatus.NO_SHOW.value: [],
}


def _format_appointment(app: Appointment) -> AppointmentDetailResponse:
    events = [
        AppointmentEventResponse(
            id=e.id,
            from_status=e.from_status,
            to_status=e.to_status,
            notes=e.notes,
            created_at=e.created_at
        )
        for e in app.events
    ]
    return AppointmentDetailResponse(
        id=app.id,
        patient_id=app.patient_id,
        patient_name=app.patient.full_name if app.patient else "Patient",
        patient_phone=app.patient.user.phone if app.patient and app.patient.user else None,
        doctor_id=app.doctor_id,
        doctor_name=app.doctor.full_name if app.doctor else "Doctor",
        service_id=app.service_id,
        service_name=app.service.name if app.service else "Dental Service",
        appointment_date=app.appointment_date.isoformat(),
        start_time=app.start_time.strftime("%H:%M"),
        end_time=app.end_time.strftime("%H:%M"),
        status=app.status,
        chief_complaint=app.chief_complaint,
        rejection_reason=app.rejection_reason,
        cancellation_reason=app.cancellation_reason,
        proposed_new_date=app.proposed_new_date.isoformat() if app.proposed_new_date else None,
        proposed_new_time=app.proposed_new_time.strftime("%H:%M") if app.proposed_new_time else None,
        created_at=app.created_at,
        events=events
    )


@router.get("/me", response_model=List[AppointmentDetailResponse])
def get_my_appointments(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """Retrieve all appointments for the authenticated patient."""
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        return []

    appointments = (
        db.query(Appointment)
        .filter(Appointment.patient_id == profile.id)
        .order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())
        .all()
    )
    return [_format_appointment(app) for app in appointments]


@router.post("", response_model=AppointmentDetailResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: CreateAppointmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Book an appointment.
    - If patient: patient_id is derived strictly from verified JWT token.
    - If staff: staff can book for any registered patient.
    - Uses transactional concurrency check to guarantee zero double bookings.
    """
    # 1. Determine patient_id
    if current_user.role == UserRole.PATIENT.value:
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        if not profile:
            profile = PatientProfile(
                user_id=current_user.id,
                first_name="Patient",
                last_name="User",
                city="Vadodara"
            )
            db.add(profile)
            db.flush()
        patient_id = profile.id
        initial_status = AppointmentStatus.PENDING_REVIEW.value
    else:
        if not payload.patient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="patient_id is required when staff creates an appointment.",
            )
        patient = db.query(PatientProfile).filter(PatientProfile.id == payload.patient_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target patient not found.")
        patient_id = payload.patient_id
        initial_status = AppointmentStatus.CONFIRMED.value

    # 2. Validate Service and Doctor
    service = db.query(Service).filter(Service.id == payload.service_id, Service.is_active.is_(True)).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

    target_doctor_id = payload.doctor_id
    if not target_doctor_id:
        default_doc = db.query(DoctorProfile).filter(DoctorProfile.is_active.is_(True)).order_by(DoctorProfile.experience_years.desc()).first()
        if not default_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active doctor available.")
        target_doctor_id = default_doc.id

    doctor = db.query(DoctorProfile).filter(DoctorProfile.id == target_doctor_id, DoctorProfile.is_active.is_(True)).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found.")

    # 3. Calculate start and end times
    try:
        start_time_obj = datetime.strptime(payload.start_time, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid start_time format (expected HH:MM).")

    start_dt = datetime.combine(payload.appointment_date, start_time_obj)
    end_dt = start_dt + timedelta(minutes=service.duration_minutes)
    end_time_obj = end_dt.time()

    # 4. Strict concurrency check to prevent race conditions / double booking
    with db.begin_nested():
        existing = (
            db.query(Appointment)
            .filter(
                Appointment.doctor_id == target_doctor_id,
                Appointment.appointment_date == payload.appointment_date,
                Appointment.start_time == start_time_obj,
                Appointment.status.notin_([AppointmentStatus.CANCELLED.value, "REJECTED"])
            )
            .with_for_update()
            .first()
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The selected appointment slot has already been reserved. Please select another slot.",
            )

        appointment = Appointment(
            patient_id=patient_id,
            doctor_id=target_doctor_id,
            service_id=payload.service_id,
            appointment_date=payload.appointment_date,
            start_time=start_time_obj,
            end_time=end_time_obj,
            status=initial_status,
            chief_complaint=payload.chief_complaint,
            created_by_id=current_user.id
        )
        db.add(appointment)
        db.flush()

        # Add initial audit event
        event = AppointmentEvent(
            appointment_id=appointment.id,
            from_status=None,
            to_status=initial_status,
            changed_by_id=current_user.id,
            notes="Appointment request created." if initial_status == AppointmentStatus.PENDING_REVIEW.value else "Appointment scheduled directly by clinic desk."
        )
        db.add(event)

    db.commit()
    db.refresh(appointment)

    # Dispatch notification to patient
    target_user_id = appointment.patient.user_id if appointment.patient else current_user.id
    notification_service.send_notification(
        db=db,
        user_id=target_user_id,
        title="Appointment Request Received",
        body=f"Your appointment request for {service.name} on {payload.appointment_date} at {payload.start_time} is under review by Kumar Dental Clinic.",
        idempotency_key=f"app_created_{appointment.id}"
    )

    return _format_appointment(appointment)


@router.get("/{appointment_id}", response_model=AppointmentDetailResponse)
def get_appointment(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve detailed appointment information (access-controlled)."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

    # Access control: patient can only view own appointment
    if current_user.role == UserRole.PATIENT.value:
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        if not profile or profile.id != appointment.patient_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this appointment.")

    return _format_appointment(appointment)


@router.patch("/{appointment_id}/status", response_model=AppointmentDetailResponse)
def update_appointment_status(
    appointment_id: str,
    payload: UpdateStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Transition appointment status with mandatory server validation, audit event logging, and patient notification.
    """
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

    # Permitted transitions check
    allowed_targets = VALID_TRANSITIONS.get(appointment.status, [])
    if payload.status not in allowed_targets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from '{appointment.status}' to '{payload.status}'. Allowed: {', '.join(allowed_targets) if allowed_targets else 'None (Terminal state)'}.",
        )

    # Role permission check on transition
    if current_user.role == UserRole.PATIENT.value:
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        if not profile or profile.id != appointment.patient_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        # Patient can only trigger cancellation or accept reschedule
        if payload.status not in [AppointmentStatus.CANCELLATION_REQUESTED.value, AppointmentStatus.CONFIRMED.value, AppointmentStatus.CANCELLED.value]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patients cannot set this status.")

    old_status = appointment.status
    appointment.status = payload.status
    appointment.updated_by_id = current_user.id

    if payload.rejection_reason:
        appointment.rejection_reason = payload.rejection_reason
    if payload.cancellation_reason:
        appointment.cancellation_reason = payload.cancellation_reason
    if payload.proposed_new_date:
        appointment.proposed_new_date = payload.proposed_new_date
    if payload.proposed_new_time:
        try:
            appointment.proposed_new_time = datetime.strptime(payload.proposed_new_time, "%H:%M").time()
        except ValueError:
            pass

    # Record audit event
    event = AppointmentEvent(
        appointment_id=appointment.id,
        from_status=old_status,
        to_status=payload.status,
        changed_by_id=current_user.id,
        notes=payload.notes or f"Status transitioned from {old_status} to {payload.status}."
    )
    db.add(event)
    db.commit()
    db.refresh(appointment)

    # Dispatch notification to patient
    target_user_id = appointment.patient.user_id if appointment.patient else None
    if target_user_id:
        notification_service.send_notification(
            db=db,
            user_id=target_user_id,
            title=f"Appointment {payload.status.replace('_', ' ').title()}",
            body=f"Your appointment on {appointment.appointment_date} is now {payload.status.replace('_', ' ').lower()}.",
            idempotency_key=f"app_status_{appointment.id}_{payload.status}"
        )

    return _format_appointment(appointment)


@router.post("/{appointment_id}/cancel-request", response_model=AppointmentDetailResponse)
def request_cancellation(
    appointment_id: str,
    payload: CancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Patient requests cancellation of an upcoming appointment."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

    if current_user.role == UserRole.PATIENT.value:
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        if not profile or profile.id != appointment.patient_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    old_status = appointment.status
    appointment.status = AppointmentStatus.CANCELLATION_REQUESTED.value
    appointment.cancellation_reason = payload.reason
    appointment.updated_by_id = current_user.id

    event = AppointmentEvent(
        appointment_id=appointment.id,
        from_status=old_status,
        to_status=AppointmentStatus.CANCELLATION_REQUESTED.value,
        changed_by_id=current_user.id,
        notes=f"Cancellation requested by patient: {payload.reason}"
    )
    db.add(event)
    db.commit()
    db.refresh(appointment)

    return _format_appointment(appointment)


@router.post("/{appointment_id}/reschedule-request", response_model=AppointmentDetailResponse)
def request_reschedule(
    appointment_id: str,
    payload: RescheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Patient or staff requests reschedule with new preferred date and time."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

    try:
        new_time_obj = datetime.strptime(payload.new_start_time, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid new_start_time format (HH:MM).")

    old_status = appointment.status
    appointment.status = AppointmentStatus.RESCHEDULE_PROPOSED.value
    appointment.proposed_new_date = payload.new_date
    appointment.proposed_new_time = new_time_obj
    appointment.updated_by_id = current_user.id

    event = AppointmentEvent(
        appointment_id=appointment.id,
        from_status=old_status,
        to_status=AppointmentStatus.RESCHEDULE_PROPOSED.value,
        changed_by_id=current_user.id,
        notes=payload.reason or f"Reschedule proposed for {payload.new_date} at {payload.new_start_time}."
    )
    db.add(event)
    db.commit()
    db.refresh(appointment)

    return _format_appointment(appointment)
