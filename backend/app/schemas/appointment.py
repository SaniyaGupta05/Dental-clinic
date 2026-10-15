from datetime import date, time, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class CreateAppointmentRequest(BaseModel):
    doctor_id: Optional[str] = None
    service_id: str
    appointment_date: date
    start_time: str = Field(..., json_schema_extra={"example": "10:00"}, description="Start time as HH:MM")
    chief_complaint: Optional[str] = None
    patient_id: Optional[str] = Field(None, description="Required only when staff books on behalf of a patient")


class UpdateStatusRequest(BaseModel):
    status: str = Field(..., description="Target status: CONFIRMED, RESCHEDULE_PROPOSED, CANCELLED, CHECKED_IN, COMPLETED, NO_SHOW")
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    cancellation_reason: Optional[str] = None
    proposed_new_date: Optional[date] = None
    proposed_new_time: Optional[str] = None


class CancelRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class RescheduleRequest(BaseModel):
    new_date: date
    new_start_time: str = Field(..., json_schema_extra={"example": "11:30"})
    reason: Optional[str] = None


class AppointmentEventResponse(BaseModel):
    id: str
    from_status: Optional[str] = None
    to_status: str
    notes: Optional[str] = None
    created_at: datetime


class AppointmentDetailResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    patient_phone: Optional[str] = None
    doctor_id: str
    doctor_name: str
    service_id: str
    service_name: str
    appointment_date: str
    start_time: str
    end_time: str
    status: str
    chief_complaint: Optional[str] = None
    rejection_reason: Optional[str] = None
    cancellation_reason: Optional[str] = None
    proposed_new_date: Optional[str] = None
    proposed_new_time: Optional[str] = None
    created_at: datetime
    events: List[AppointmentEventResponse] = []


class AppointmentListResponse(BaseModel):
    items: List[AppointmentDetailResponse]
    total: int
    page: int
    size: int
