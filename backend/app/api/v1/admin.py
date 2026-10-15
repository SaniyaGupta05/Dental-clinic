from datetime import datetime, date as date_type, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_staff, require_admin
from app.models.user import User, UserRole
from app.models.profile import PatientProfile, DoctorProfile, StaffProfile
from app.models.appointment import Appointment, AppointmentStatus, AppointmentEvent
from app.models.notification import FollowUp, FollowUpStatus
from app.models.audit import AuditLog
from app.models.service import ClinicSetting
from app.schemas.admin import (
    DashboardStatsResponse,
    PatientSummary,
    PatientListResponse,
    PatientCreateAdminRequest,
    AuditLogResponse,
    ClinicSettingsResponse,
    ClinicSettingsUpdate,
)
from app.schemas.appointment import AppointmentDetailResponse, AppointmentEventResponse

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStatsResponse)
def get_dashboard_kpis(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Real-time clinic dashboard operational KPIs calculated directly from PostgreSQL queries.
    """
    now_utc = datetime.now(timezone.utc)
    ist_offset = timedelta(hours=5, minutes=30)
    today = (now_utc + ist_offset).date()

    # Appointment queries
    today_total = db.query(func.count(Appointment.id)).filter(Appointment.appointment_date == today).scalar() or 0
    pending_review = db.query(func.count(Appointment.id)).filter(Appointment.status == AppointmentStatus.PENDING_REVIEW.value).scalar() or 0
    confirmed = db.query(func.count(Appointment.id)).filter(Appointment.status == AppointmentStatus.CONFIRMED.value).scalar() or 0
    completed = db.query(func.count(Appointment.id)).filter(Appointment.status == AppointmentStatus.COMPLETED.value).scalar() or 0
    cancellation_requests = db.query(func.count(Appointment.id)).filter(Appointment.status == AppointmentStatus.CANCELLATION_REQUESTED.value).scalar() or 0

    # Follow-ups query
    upcoming_follow_ups = db.query(func.count(FollowUp.id)).filter(FollowUp.status == FollowUpStatus.PENDING.value).scalar() or 0

    # Total patients query
    total_patients = db.query(func.count(PatientProfile.id)).scalar() or 0

    # Recent operational activities
    recent_events = (
        db.query(AppointmentEvent)
        .order_by(AppointmentEvent.created_at.desc())
        .limit(10)
        .all()
    )
    activity = [
        {
            "id": e.id,
            "type": "appointment_event",
            "to_status": e.to_status,
            "notes": e.notes,
            "appointment_id": e.appointment_id,
            "created_at": e.created_at.isoformat()
        }
        for e in recent_events
    ]

    return DashboardStatsResponse(
        today_total=today_total,
        pending_review=pending_review,
        confirmed=confirmed,
        completed=completed,
        cancellation_requests=cancellation_requests,
        upcoming_follow_ups=upcoming_follow_ups,
        total_patients=total_patients,
        recent_activity=activity
    )


@router.get("/appointments", response_model=List[AppointmentDetailResponse])
def list_admin_appointments(
    date_val: Optional[date_type] = Query(None, alias="date"),
    doctor_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Filter clinic appointments for reception and doctor agenda views."""
    query = db.query(Appointment)

    # If caller is a doctor, filter by their doctor profile by default unless supervisor admin
    if current_user.role == UserRole.DOCTOR.value and not doctor_id:
        doc_prof = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
        if doc_prof:
            query = query.filter(Appointment.doctor_id == doc_prof.id)

    if date_val:
        query = query.filter(Appointment.appointment_date == date_val)
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if status_filter:
        query = query.filter(Appointment.status == status_filter)

    appointments = query.order_by(Appointment.appointment_date.asc(), Appointment.start_time.asc()).all()

    results = []
    for app in appointments:
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
        results.append(AppointmentDetailResponse(
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
        ))
    return results


@router.get("/patients", response_model=PatientListResponse)
def search_patients(
    query: Optional[str] = Query(None, description="Search by patient name, phone, or email"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Search and paginate registered patients."""
    base_query = db.query(PatientProfile).join(User, PatientProfile.user_id == User.id)

    if query:
        term = f"%{query.strip()}%"
        base_query = base_query.filter(
            or_(
                PatientProfile.first_name.ilike(term),
                PatientProfile.last_name.ilike(term),
                User.phone.ilike(term),
                User.email.ilike(term)
            )
        )

    total = base_query.count()
    patients = base_query.order_by(PatientProfile.created_at.desc()).offset((page - 1) * size).limit(size).all()

    items = [
        PatientSummary(
            id=p.id,
            user_id=p.user_id,
            first_name=p.first_name,
            last_name=p.last_name,
            full_name=p.full_name,
            phone=p.user.phone if p.user else None,
            email=p.user.email if p.user else None,
            gender=p.gender,
            blood_group=p.blood_group,
            city=p.city,
            created_at=p.created_at,
            total_appointments=len(p.appointments)
        )
        for p in patients
    ]

    return PatientListResponse(
        items=items,
        total=total,
        page=page,
        size=size
    )


@router.post("/patients", response_model=PatientSummary, status_code=status.HTTP_201_CREATED)
def create_patient_admin(
    payload: PatientCreateAdminRequest,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Register a new patient at clinic reception on their behalf."""
    phone_clean = payload.phone.strip()
    if not phone_clean.startswith("+"):
        if len(phone_clean) == 10:
            phone_clean = "+91" + phone_clean
        else:
            phone_clean = "+" + phone_clean

    # Prevent duplicate accounts with same phone
    existing_user = db.query(User).filter(User.phone == phone_clean).first()
    if existing_user and existing_user.patient_profile:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A patient with phone number {phone_clean} is already registered.",
        )

    if not existing_user:
        user = User(
            phone=phone_clean,
            email=payload.email,
            role=UserRole.PATIENT.value,
            is_active=True,
            is_verified=True
        )
        db.add(user)
        db.flush()
    else:
        user = existing_user

    profile = PatientProfile(
        user_id=user.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        blood_group=payload.blood_group,
        allergies=payload.allergies,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        address=payload.address,
        city=payload.city
    )
    db.add(profile)

    audit = AuditLog(
        actor_id=current_user.id,
        action="REGISTER_PATIENT_DESK",
        target_type="patient_profile",
        target_id=profile.id,
        metadata_json={"phone": phone_clean, "name": f"{payload.first_name} {payload.last_name}"}
    )
    db.add(audit)
    db.commit()
    db.refresh(profile)

    return PatientSummary(
        id=profile.id,
        user_id=user.id,
        first_name=profile.first_name,
        last_name=profile.last_name,
        full_name=profile.full_name,
        phone=user.phone,
        email=user.email,
        gender=profile.gender,
        blood_group=profile.blood_group,
        city=profile.city,
        created_at=profile.created_at,
        total_appointments=0
    )


@router.get("/patients/{patient_id}")
def get_patient_detail(
    patient_id: str,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Retrieve full patient demographic information and appointment history."""
    patient = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    # Sort appointments
    app_list = [
        {
            "id": a.id,
            "doctor_name": a.doctor.full_name if a.doctor else "Doctor",
            "service_name": a.service.name if a.service else "Service",
            "appointment_date": a.appointment_date.isoformat(),
            "start_time": a.start_time.strftime("%H:%M"),
            "status": a.status,
            "created_at": a.created_at.isoformat()
        }
        for a in patient.appointments
    ]

    return {
        "id": patient.id,
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "full_name": patient.full_name,
        "phone": patient.user.phone if patient.user else None,
        "email": patient.user.email if patient.user else None,
        "gender": patient.gender,
        "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
        "blood_group": patient.blood_group,
        "emergency_contact_name": patient.emergency_contact_name,
        "emergency_contact_phone": patient.emergency_contact_phone,
        "allergies": patient.allergies,
        "address": patient.address,
        "city": patient.city,
        "created_at": patient.created_at.isoformat(),
        "appointments": app_list
    }


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Access security audit trail (Restricted strictly to Administrators)."""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        AuditLogResponse(
            id=log.id,
            actor_id=log.actor_id,
            actor_name=log.actor.email if (log.actor and log.actor.email) else "System",
            action=log.action,
            target_type=log.target_type,
            target_id=log.target_id,
            ip_address=log.ip_address,
            created_at=log.created_at,
            metadata_json=log.metadata_json
        )
        for log in logs
    ]


@router.get("/settings", response_model=ClinicSettingsResponse)
def get_clinic_settings(db: Session = Depends(get_db)):
    """Retrieve verified clinic profile and operational settings."""
    setting = db.query(ClinicSetting).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Clinic settings not configured.")
    return ClinicSettingsResponse(
        id=setting.id,
        clinic_name=setting.clinic_name,
        tagline=setting.tagline,
        phone_primary=setting.phone_primary,
        phone_secondary=setting.phone_secondary,
        phone_landline=setting.phone_landline,
        email=setting.email,
        address=setting.address,
        google_maps_url=setting.google_maps_url,
        booking_buffer_minutes=setting.booking_buffer_minutes,
        max_advance_booking_days=setting.max_advance_booking_days
    )


@router.patch("/settings", response_model=ClinicSettingsResponse)
def update_clinic_settings(
    payload: ClinicSettingsUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update clinic configuration (Admin only)."""
    setting = db.query(ClinicSetting).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Clinic settings not found.")

    if payload.clinic_name: setting.clinic_name = payload.clinic_name
    if payload.tagline is not None: setting.tagline = payload.tagline
    if payload.phone_primary: setting.phone_primary = payload.phone_primary
    if payload.phone_secondary is not None: setting.phone_secondary = payload.phone_secondary
    if payload.phone_landline is not None: setting.phone_landline = payload.phone_landline
    if payload.email: setting.email = payload.email
    if payload.address: setting.address = payload.address
    if payload.google_maps_url is not None: setting.google_maps_url = payload.google_maps_url
    if payload.booking_buffer_minutes is not None: setting.booking_buffer_minutes = payload.booking_buffer_minutes
    if payload.max_advance_booking_days is not None: setting.max_advance_booking_days = payload.max_advance_booking_days

    db.commit()
    db.refresh(setting)

    return ClinicSettingsResponse(
        id=setting.id,
        clinic_name=setting.clinic_name,
        tagline=setting.tagline,
        phone_primary=setting.phone_primary,
        phone_secondary=setting.phone_secondary,
        phone_landline=setting.phone_landline,
        email=setting.email,
        address=setting.address,
        google_maps_url=setting.google_maps_url,
        booking_buffer_minutes=setting.booking_buffer_minutes,
        max_advance_booking_days=setting.max_advance_booking_days
    )
