from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_doctor, require_patient, verify_patient_record_access
from app.models.user import User, UserRole
from app.models.profile import PatientProfile, DoctorProfile
from app.models.appointment import Appointment
from app.models.clinical import TreatmentRecord, Prescription, PrescriptionItem
from app.models.audit import AuditLog
from app.schemas.clinical import (
    CreateTreatmentRecordRequest,
    TreatmentRecordResponse,
    CreatePrescriptionRequest,
    PrescriptionResponse,
    PrescriptionItemResponse,
)

router = APIRouter()


@router.post("/appointments/{appointment_id}/treatment-records", response_model=TreatmentRecordResponse, status_code=status.HTTP_201_CREATED)
def create_treatment_record(
    appointment_id: str,
    payload: CreateTreatmentRecordRequest,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    """
    Author a clinical treatment record for an appointment.
    Restricted strictly to authorized clinicians (Receptionist denied).
    """
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")

    existing = db.query(TreatmentRecord).filter(TreatmentRecord.appointment_id == appointment_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A treatment record has already been finalized for this appointment.",
        )

    # Determine doctor_id
    doctor_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    doctor_id = doctor_profile.id if doctor_profile else appointment.doctor_id

    record = TreatmentRecord(
        appointment_id=appointment.id,
        patient_id=appointment.patient_id,
        doctor_id=doctor_id,
        tooth_number=payload.tooth_number,
        diagnosis=payload.diagnosis,
        clinical_notes=payload.clinical_notes,
        treatment_performed=payload.treatment_performed,
        follow_up_recommendation=payload.follow_up_recommendation
    )
    db.add(record)

    # Audit log entry
    audit = AuditLog(
        actor_id=current_user.id,
        action="CREATE_TREATMENT_RECORD",
        target_type="treatment_record",
        target_id=record.id,
        metadata_json={"appointment_id": appointment_id, "patient_id": appointment.patient_id}
    )
    db.add(audit)
    db.commit()
    db.refresh(record)

    return TreatmentRecordResponse(
        id=record.id,
        appointment_id=record.appointment_id,
        patient_id=record.patient_id,
        doctor_id=record.doctor_id,
        doctor_name=record.doctor.full_name if record.doctor else "Dentist",
        tooth_number=record.tooth_number,
        diagnosis=record.diagnosis,
        clinical_notes=record.clinical_notes,
        treatment_performed=record.treatment_performed,
        follow_up_recommendation=record.follow_up_recommendation,
        created_at=record.created_at
    )


@router.get("/appointments/{appointment_id}/treatment-records", response_model=TreatmentRecordResponse)
def get_treatment_record(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve clinical treatment record for an appointment.
    Enforces record-level security (receptionist access strictly denied).
    """
    record = db.query(TreatmentRecord).filter(TreatmentRecord.appointment_id == appointment_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No treatment record found for this appointment.")

    # Record-level verification: receptionists denied
    verify_patient_record_access(current_user, record.patient_id, db, allow_receptionist=False)

    return TreatmentRecordResponse(
        id=record.id,
        appointment_id=record.appointment_id,
        patient_id=record.patient_id,
        doctor_id=record.doctor_id,
        doctor_name=record.doctor.full_name if record.doctor else "Dentist",
        tooth_number=record.tooth_number,
        diagnosis=record.diagnosis,
        clinical_notes=record.clinical_notes,
        treatment_performed=record.treatment_performed,
        follow_up_recommendation=record.follow_up_recommendation,
        created_at=record.created_at
    )


@router.post("/prescriptions", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
def create_prescription(
    payload: CreatePrescriptionRequest,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    """Author and sign a clinical prescription with medication items."""
    doctor_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    doctor_id = doctor_profile.id if doctor_profile else (db.query(DoctorProfile).first().id)

    prescription = Prescription(
        appointment_id=payload.appointment_id,
        patient_id=payload.patient_id,
        doctor_id=doctor_id,
        notes=payload.notes,
        follow_up_date=payload.follow_up_date,
        is_finalized=True
    )
    db.add(prescription)
    db.flush()

    for item in payload.items:
        p_item = PrescriptionItem(
            prescription_id=prescription.id,
            medicine_name=item.medicine_name,
            dosage=item.dosage,
            timing=item.timing,
            duration=item.duration,
            instructions=item.instructions
        )
        db.add(p_item)

    audit = AuditLog(
        actor_id=current_user.id,
        action="CREATE_PRESCRIPTION",
        target_type="prescription",
        target_id=prescription.id,
        metadata_json={"patient_id": payload.patient_id}
    )
    db.add(audit)
    db.commit()
    db.refresh(prescription)

    items_res = [
        PrescriptionItemResponse(
            id=i.id,
            medicine_name=i.medicine_name,
            dosage=i.dosage,
            timing=i.timing,
            duration=i.duration,
            instructions=i.instructions
        )
        for i in prescription.items
    ]

    return PrescriptionResponse(
        id=prescription.id,
        patient_id=prescription.patient_id,
        doctor_id=prescription.doctor_id,
        doctor_name=prescription.doctor.full_name if prescription.doctor else "Doctor",
        appointment_id=prescription.appointment_id,
        notes=prescription.notes,
        follow_up_date=prescription.follow_up_date.isoformat() if prescription.follow_up_date else None,
        is_finalized=prescription.is_finalized,
        created_at=prescription.created_at,
        items=items_res
    )


@router.get("/patients/me/prescriptions", response_model=List[PrescriptionResponse])
def get_my_prescriptions(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """Patient retrieves their own authorized clinical prescriptions."""
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        return []

    prescriptions = (
        db.query(Prescription)
        .filter(Prescription.patient_id == profile.id, Prescription.is_finalized.is_(True))
        .order_by(Prescription.created_at.desc())
        .all()
    )

    result = []
    for p in prescriptions:
        items = [
            PrescriptionItemResponse(
                id=i.id,
                medicine_name=i.medicine_name,
                dosage=i.dosage,
                timing=i.timing,
                duration=i.duration,
                instructions=i.instructions
            )
            for i in p.items
        ]
        result.append(PrescriptionResponse(
            id=p.id,
            patient_id=p.patient_id,
            doctor_id=p.doctor_id,
            doctor_name=p.doctor.full_name if p.doctor else "Dentist",
            appointment_id=p.appointment_id,
            notes=p.notes,
            follow_up_date=p.follow_up_date.isoformat() if p.follow_up_date else None,
            is_finalized=p.is_finalized,
            created_at=p.created_at,
            items=items
        ))
    return result


@router.get("/patients/{patient_id}/prescriptions", response_model=List[PrescriptionResponse])
def get_patient_prescriptions(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve prescriptions for a patient (authorized clinician or own patient)."""
    verify_patient_record_access(current_user, patient_id, db, allow_receptionist=False)

    prescriptions = (
        db.query(Prescription)
        .filter(Prescription.patient_id == patient_id)
        .order_by(Prescription.created_at.desc())
        .all()
    )

    result = []
    for p in prescriptions:
        items = [
            PrescriptionItemResponse(
                id=i.id,
                medicine_name=i.medicine_name,
                dosage=i.dosage,
                timing=i.timing,
                duration=i.duration,
                instructions=i.instructions
            )
            for i in p.items
        ]
        result.append(PrescriptionResponse(
            id=p.id,
            patient_id=p.patient_id,
            doctor_id=p.doctor_id,
            doctor_name=p.doctor.full_name if p.doctor else "Dentist",
            appointment_id=p.appointment_id,
            notes=p.notes,
            follow_up_date=p.follow_up_date.isoformat() if p.follow_up_date else None,
            is_finalized=p.is_finalized,
            created_at=p.created_at,
            items=items
        ))
    return result


@router.get("/patients/me/records")
def get_my_records(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """Patient retrieves their complete clinical health history: treatments, prescriptions, follow-ups."""
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        return {"treatments": [], "prescriptions": [], "follow_ups": []}

    treatments = (
        db.query(TreatmentRecord)
        .filter(TreatmentRecord.patient_id == profile.id)
        .order_by(TreatmentRecord.created_at.desc())
        .all()
    )

    prescriptions = (
        db.query(Prescription)
        .filter(Prescription.patient_id == profile.id, Prescription.is_finalized.is_(True))
        .order_by(Prescription.created_at.desc())
        .all()
    )

    rx_list = []
    for p in prescriptions:
        rx_list.append({
            "id": p.id,
            "appointment_reference": str(p.appointment_id)[:8] if p.appointment_id else None,
            "doctor_name": p.doctor.full_name if p.doctor else "Dentist",
            "notes": p.notes,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "items": [
                {
                    "medication_name": i.medicine_name,
                    "dosage": i.dosage,
                    "frequency": i.timing,
                    "duration": i.duration,
                    "instructions": i.instructions
                }
                for i in p.items
            ]
        })

    treatment_list = [
        {
            "id": t.id,
            "treatment_performed": t.treatment_performed,
            "tooth_number": t.tooth_number,
            "clinical_notes": t.clinical_notes,
            "diagnosis": t.diagnosis,
            "created_at": t.created_at.isoformat() if t.created_at else None
        }
        for t in treatments
    ]

    return {
        "treatments": treatment_list,
        "prescriptions": rx_list,
        "follow_ups": []
    }
