import enum
from datetime import date, time
from typing import Optional, List
from sqlalchemy import String, Date, Time, Text, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class AppointmentStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    CONFIRMED = "CONFIRMED"
    RESCHEDULE_PROPOSED = "RESCHEDULE_PROPOSED"
    CANCELLATION_REQUESTED = "CANCELLATION_REQUESTED"
    CANCELLED = "CANCELLED"
    CHECKED_IN = "CHECKED_IN"
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"


class Appointment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "appointments"

    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patient_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctor_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    service_id: Mapped[str] = mapped_column(String(36), ForeignKey("services.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False, index=True)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default=AppointmentStatus.PENDING_REVIEW.value, nullable=False, index=True)
    
    chief_complaint: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    proposed_new_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    proposed_new_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    
    created_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    updated_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    # Relationships
    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="appointments")
    doctor: Mapped["DoctorProfile"] = relationship("DoctorProfile", back_populates="appointments")
    service: Mapped["Service"] = relationship("Service", back_populates="appointments")
    events: Mapped[List["AppointmentEvent"]] = relationship("AppointmentEvent", back_populates="appointment", cascade="all, delete-orphan", order_by="AppointmentEvent.created_at.desc()")
    treatment_record: Mapped[Optional["TreatmentRecord"]] = relationship("TreatmentRecord", back_populates="appointment", uselist=False)
    prescriptions: Mapped[List["Prescription"]] = relationship("Prescription", back_populates="appointment")
    follow_ups: Mapped[List["FollowUp"]] = relationship("FollowUp", back_populates="appointment")

    __table_args__ = (
        Index("ix_appointments_doctor_date_time", "doctor_id", "appointment_date", "start_time"),
    )


class AppointmentEvent(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "appointment_events"

    appointment_id: Mapped[str] = mapped_column(String(36), ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    to_status: Mapped[str] = mapped_column(String(40), nullable=False)
    changed_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    appointment: Mapped["Appointment"] = relationship("Appointment", back_populates="events")
    changed_by: Mapped["User"] = relationship("User")
