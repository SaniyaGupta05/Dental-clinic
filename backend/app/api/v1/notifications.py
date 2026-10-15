from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_staff
from app.models.user import User
from app.models.profile import PatientProfile
from app.models.notification import (
    Notification,
    NotificationPreference,
    DeviceToken,
    FollowUp,
    FollowUpStatus,
)
from app.schemas.notification import (
    NotificationResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    DeviceTokenRegister,
    CreateFollowUpRequest,
    FollowUpResponse,
)

router = APIRouter()


@router.get("", response_model=List[NotificationResponse])
def get_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve in-app notifications for the authenticated user."""
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        NotificationResponse(
            id=n.id,
            title=n.title,
            body=n.body,
            channel=n.channel,
            delivery_status=n.delivery_status,
            read_at=n.read_at,
            created_at=n.created_at
        )
        for n in notifications
    ]


@router.patch("/{notification_id}/read", status_code=status.HTTP_200_OK)
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark an in-app notification as read."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    notification.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Notification marked as read."}


@router.get("/preferences", response_model=NotificationPreferenceResponse)
def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve user notification preferences."""
    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == current_user.id).first()
    if not pref:
        pref = NotificationPreference(user_id=current_user.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return NotificationPreferenceResponse(
        push_enabled=pref.push_enabled,
        email_enabled=pref.email_enabled,
        sms_enabled=pref.sms_enabled,
        whatsapp_enabled=pref.whatsapp_enabled,
        reminder_hours_before=pref.reminder_hours_before
    )


@router.patch("/preferences", response_model=NotificationPreferenceResponse)
def update_notification_preferences(
    payload: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user notification preferences."""
    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == current_user.id).first()
    if not pref:
        pref = NotificationPreference(user_id=current_user.id)
        db.add(pref)

    if payload.push_enabled is not None: pref.push_enabled = payload.push_enabled
    if payload.email_enabled is not None: pref.email_enabled = payload.email_enabled
    if payload.sms_enabled is not None: pref.sms_enabled = payload.sms_enabled
    if payload.whatsapp_enabled is not None: pref.whatsapp_enabled = payload.whatsapp_enabled
    if payload.reminder_hours_before is not None: pref.reminder_hours_before = payload.reminder_hours_before

    db.commit()
    db.refresh(pref)

    return NotificationPreferenceResponse(
        push_enabled=pref.push_enabled,
        email_enabled=pref.email_enabled,
        sms_enabled=pref.sms_enabled,
        whatsapp_enabled=pref.whatsapp_enabled,
        reminder_hours_before=pref.reminder_hours_before
    )


@router.post("/device-token", status_code=status.HTTP_200_OK)
def register_device_token(
    payload: DeviceTokenRegister,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register Expo Push Notification token for mobile push alerts."""
    existing = db.query(DeviceToken).filter(
        DeviceToken.user_id == current_user.id,
        DeviceToken.expo_push_token == payload.expo_push_token
    ).first()

    if not existing:
        token_record = DeviceToken(
            user_id=current_user.id,
            expo_push_token=payload.expo_push_token,
            device_os=payload.device_os
        )
        db.add(token_record)
        db.commit()

    return {"message": "Device push token registered successfully."}


@router.post("/follow-ups", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
def create_follow_up(
    payload: CreateFollowUpRequest,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Create a clinical follow-up task for a patient."""
    patient = db.query(PatientProfile).filter(PatientProfile.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found.")

    follow_up = FollowUp(
        patient_id=payload.patient_id,
        assigned_to_id=current_user.id,
        appointment_id=payload.appointment_id,
        title=payload.title,
        notes=payload.notes,
        due_date=payload.due_date,
        status=FollowUpStatus.PENDING.value
    )
    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)

    return FollowUpResponse(
        id=follow_up.id,
        patient_id=follow_up.patient_id,
        patient_name=patient.full_name,
        appointment_id=follow_up.appointment_id,
        title=follow_up.title,
        notes=follow_up.notes,
        due_date=follow_up.due_date.isoformat(),
        status=follow_up.status,
        completed_at=follow_up.completed_at,
        created_at=follow_up.created_at
    )


@router.get("/admin/follow-ups", response_model=List[FollowUpResponse])
def list_follow_ups(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """List clinic operational follow-ups."""
    query = db.query(FollowUp)
    if status_filter:
        query = query.filter(FollowUp.status == status_filter)

    follow_ups = query.order_by(FollowUp.due_date.asc()).all()

    return [
        FollowUpResponse(
            id=f.id,
            patient_id=f.patient_id,
            patient_name=f.patient.full_name if f.patient else "Patient",
            appointment_id=f.appointment_id,
            title=f.title,
            notes=f.notes,
            due_date=f.due_date.isoformat(),
            status=f.status,
            completed_at=f.completed_at,
            created_at=f.created_at
        )
        for f in follow_ups
    ]


@router.patch("/admin/follow-ups/{follow_up_id}/status", response_model=FollowUpResponse)
def update_follow_up_status(
    follow_up_id: str,
    target_status: str = Query(..., description="PENDING, IN_PROGRESS, COMPLETED, CANCELLED"),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Update follow-up task status."""
    f = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow-up not found.")

    f.status = target_status
    if target_status == FollowUpStatus.COMPLETED.value:
        f.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(f)

    return FollowUpResponse(
        id=f.id,
        patient_id=f.patient_id,
        patient_name=f.patient.full_name if f.patient else "Patient",
        appointment_id=f.appointment_id,
        title=f.title,
        notes=f.notes,
        due_date=f.due_date.isoformat(),
        status=f.status,
        completed_at=f.completed_at,
        created_at=f.created_at
    )
