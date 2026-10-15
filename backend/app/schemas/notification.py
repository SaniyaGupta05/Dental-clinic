from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class NotificationResponse(BaseModel):
    id: str
    title: str
    body: str
    channel: str
    delivery_status: str
    read_at: Optional[datetime] = None
    created_at: datetime


class NotificationPreferenceResponse(BaseModel):
    push_enabled: bool
    email_enabled: bool
    sms_enabled: bool
    whatsapp_enabled: bool
    reminder_hours_before: int


class NotificationPreferenceUpdate(BaseModel):
    push_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    reminder_hours_before: Optional[int] = None


class DeviceTokenRegister(BaseModel):
    expo_push_token: str = Field(..., min_length=10)
    device_os: str = Field(default="android")


class CreateFollowUpRequest(BaseModel):
    patient_id: str
    appointment_id: Optional[str] = None
    title: str = Field(..., min_length=3, max_length=200)
    notes: Optional[str] = None
    due_date: date


class FollowUpResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    appointment_id: Optional[str] = None
    title: str
    notes: Optional[str] = None
    due_date: str
    status: str
    completed_at: Optional[datetime] = None
    created_at: datetime
