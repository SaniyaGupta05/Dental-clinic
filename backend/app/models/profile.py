from datetime import date
from typing import Optional, List
from sqlalchemy import String, Boolean, Integer, Text, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class PatientProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "patient_profiles"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    medical_history_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    allergies: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[str] = mapped_column(String(100), default="Vadodara", nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="patient_profile")
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="patient")
    documents: Mapped[List["PatientDocument"]] = relationship("PatientDocument", back_populates="patient", cascade="all, delete-orphan")
    treatment_records: Mapped[List["TreatmentRecord"]] = relationship("TreatmentRecord", back_populates="patient")
    prescriptions: Mapped[List["Prescription"]] = relationship("Prescription", back_populates="patient")
    follow_ups: Mapped[List["FollowUp"]] = relationship("FollowUp", back_populates="patient", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class DoctorProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "doctor_profiles"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    qualification: Mapped[str] = mapped_column(String(100), nullable=False)
    registration_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    specialization: Mapped[str] = mapped_column(String(150), nullable=False)
    experience_years: Mapped[int] = mapped_column(Integer, default=37, nullable=False)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="doctor_profile")
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="doctor")
    availabilities: Mapped[List["DoctorAvailability"]] = relationship("DoctorAvailability", back_populates="doctor", cascade="all, delete-orphan")
    treatment_records: Mapped[List["TreatmentRecord"]] = relationship("TreatmentRecord", back_populates="doctor")
    prescriptions: Mapped[List["Prescription"]] = relationship("Prescription", back_populates="doctor")


class StaffProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "staff_profiles"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(100), default="Front Desk", nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="staff_profile")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
