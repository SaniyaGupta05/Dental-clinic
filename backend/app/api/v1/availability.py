from datetime import datetime, date as date_type, time, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.profile import DoctorProfile
from app.models.service import DoctorAvailability, ClinicHoliday, ClinicSetting
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.service import AvailabilityResponse, TimeSlot

router = APIRouter()


@router.get("", response_model=AvailabilityResponse)
def get_doctor_availability(
    doctor_id: Optional[str] = Query(None, description="Doctor Profile UUID"),
    date_str: str = Query(..., alias="date", description="Date as YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """
    Calculate real-time availability slots for a doctor on a specific date,
    accounting for clinic operating hours, holidays, and existing reservations.
    """
    try:
        query_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Please use YYYY-MM-DD.",
        )

    # Doctor check: use specified or default to active chief doctor
    if doctor_id:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id, DoctorProfile.is_active.is_(True)).first()
    else:
        doctor = db.query(DoctorProfile).filter(DoctorProfile.is_active.is_(True)).first()

    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found.")

    day_name = query_date.strftime("%A")
    # Python weekday(): Monday is 0 and Sunday is 6.
    # Our DB day_of_week: Sunday is 0, Monday is 1 ... Saturday is 6.
    db_day_of_week = (query_date.weekday() + 1) % 7

    # 1. Sunday check
    if db_day_of_week == 0:
        return AvailabilityResponse(
            doctor_id=doctor.id,
            date=date_str,
            day_name=day_name,
            is_holiday=True,
            holiday_reason="Clinic is closed on Sundays.",
            slots=[]
        )

    # 2. Clinic holiday check
    holiday = db.query(ClinicHoliday).filter(ClinicHoliday.holiday_date == query_date).first()
    if holiday:
        return AvailabilityResponse(
            doctor_id=doctor.id,
            date=date_str,
            day_name=day_name,
            is_holiday=True,
            holiday_reason=holiday.reason,
            slots=[]
        )

    # 3. Doctor weekly schedule windows
    availabilities = (
        db.query(DoctorAvailability)
        .filter(
            DoctorAvailability.doctor_id == doctor.id,
            DoctorAvailability.day_of_week == db_day_of_week,
            DoctorAvailability.is_active.is_(True)
        )
        .order_by(DoctorAvailability.start_time.asc())
        .all()
    )

    if not availabilities:
        return AvailabilityResponse(
            doctor_id=doctor.id,
            date=date_str,
            day_name=day_name,
            is_holiday=False,
            holiday_reason="Doctor is not scheduled for consultations on this day.",
            slots=[]
        )

    # 4. Existing booked appointments for this doctor on this date
    existing_appointments = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.appointment_date == query_date,
            Appointment.status.notin_([AppointmentStatus.CANCELLED.value, "REJECTED"])
        )
        .all()
    )
    booked_start_times = {app.start_time.strftime("%H:%M") for app in existing_appointments}

    # Current local time comparison in clinic timezone (Asia/Kolkata UTC+5:30)
    now_utc = datetime.now(timezone.utc)
    ist_offset = timedelta(hours=5, minutes=30)
    now_ist = now_utc + ist_offset
    is_today = query_date == now_ist.date()

    # 5. Generate slots
    slots: List[TimeSlot] = []
    for avail in availabilities:
        slot_dur = timedelta(minutes=avail.slot_duration_minutes)
        cur_dt = datetime.combine(query_date, avail.start_time)
        end_dt = datetime.combine(query_date, avail.end_time)

        while cur_dt + slot_dur <= end_dt:
            slot_start_str = cur_dt.strftime("%H:%M")
            slot_end_str = (cur_dt + slot_dur).strftime("%H:%M")

            is_available = True
            reason = None

            if slot_start_str in booked_start_times:
                is_available = False
                reason = "Already reserved"
            elif is_today and cur_dt.time() <= (now_ist + timedelta(minutes=15)).time():
                is_available = False
                reason = "Slot time has passed"

            slots.append(TimeSlot(
                start_time=slot_start_str,
                end_time=slot_end_str,
                is_available=is_available,
                reason=reason
            ))

            cur_dt += slot_dur

    return AvailabilityResponse(
        doctor_id=doctor.id,
        date=date_str,
        day_name=day_name,
        is_holiday=False,
        slots=slots
    )
