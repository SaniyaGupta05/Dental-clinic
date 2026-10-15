from datetime import time, date
from typing import Optional, List
from sqlalchemy import String, Boolean, Integer, Numeric, Text, Date, Time, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class Service(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "services"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="General", nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    price: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="service")


class DoctorAvailability(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "doctor_availability"

    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Sunday, 1=Monday ... 6=Saturday
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    slot_duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    doctor: Mapped["DoctorProfile"] = relationship("DoctorProfile", back_populates="availabilities")


class ClinicHoliday(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "clinic_holidays"

    holiday_date: Mapped[date] = mapped_column(Date, unique=True, index=True, nullable=False)
    reason: Mapped[str] = mapped_column(String(200), nullable=False)


class ClinicSetting(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "clinic_settings"

    clinic_name: Mapped[str] = mapped_column(String(200), default="Kumar Dental Clinic", nullable=False)
    tagline: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    phone_primary: Mapped[str] = mapped_column(String(25), default="+91 98240 37497", nullable=False)
    phone_secondary: Mapped[Optional[str]] = mapped_column(String(25), default="+91 95120 37497", nullable=True)
    phone_landline: Mapped[Optional[str]] = mapped_column(String(25), default="+91 265 2314153", nullable=True)
    email: Mapped[str] = mapped_column(String(100), default="contact@kumardentalclinic.com", nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    google_maps_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    booking_buffer_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    max_advance_booking_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
