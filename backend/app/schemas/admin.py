from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


class DashboardStatsResponse(BaseModel):
    today_total: int
    pending_review: int
    confirmed: int
    completed: int
    cancellation_requests: int
    upcoming_follow_ups: int
    total_patients: int
    recent_activity: List[Dict[str, Any]] = []


class PatientSummary(BaseModel):
    id: str
    user_id: str
    first_name: str
    last_name: str
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    city: str
    created_at: datetime
    total_appointments: int = 0


class PatientListResponse(BaseModel):
    items: List[PatientSummary]
    total: int
    page: int
    size: int


class PatientCreateAdminRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=10, max_length=20)
    email: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    address: Optional[str] = None
    city: str = "Vadodara"

    @field_validator("date_of_birth", mode="before")
    @classmethod
    def empty_str_to_none_date(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("email", "allergies", "emergency_contact_name", "emergency_contact_phone", "address", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v


class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    action: str
    target_type: str
    target_id: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    metadata_json: Optional[Dict[str, Any]] = None


class ClinicSettingsResponse(BaseModel):
    id: str
    clinic_name: str
    tagline: Optional[str] = None
    phone_primary: str
    phone_secondary: Optional[str] = None
    phone_landline: Optional[str] = None
    email: str
    address: str
    google_maps_url: Optional[str] = None
    booking_buffer_minutes: int
    max_advance_booking_days: int


class ClinicSettingsUpdate(BaseModel):
    clinic_name: Optional[str] = None
    tagline: Optional[str] = None
    phone_primary: Optional[str] = None
    phone_secondary: Optional[str] = None
    phone_landline: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    google_maps_url: Optional[str] = None
    booking_buffer_minutes: Optional[int] = None
    max_advance_booking_days: Optional[int] = None
