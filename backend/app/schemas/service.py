from datetime import time, date
from typing import Optional, List
from pydantic import BaseModel, Field


class ServiceResponse(BaseModel):
    id: str
    name: str
    slug: str
    category: str
    description: str
    duration_minutes: int
    price: Optional[float] = None
    is_active: bool
    display_order: int


class DoctorSummary(BaseModel):
    id: str
    full_name: str
    qualification: str
    specialization: str
    experience_years: int
    bio: Optional[str] = None


class TimeSlot(BaseModel):
    start_time: str
    end_time: str
    is_available: bool
    reason: Optional[str] = None


class AvailabilityResponse(BaseModel):
    doctor_id: str
    date: str
    day_name: str
    is_holiday: bool
    holiday_reason: Optional[str] = None
    slots: List[TimeSlot]
