from datetime import date
from typing import Optional, List
from sqlalchemy import String, Boolean, Text, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class TreatmentRecord(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "treatment_records"

    appointment_id: Mapped[str] = mapped_column(String(36), ForeignKey("appointments.id", ondelete="RESTRICT"), unique=True, nullable=False)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patient_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctor_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    tooth_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # E.g., '16', '36', 'Upper Anterior'
    diagnosis: Mapped[str] = mapped_column(Text, nullable=False)
    clinical_notes: Mapped[str] = mapped_column(Text, nullable=False)
    treatment_performed: Mapped[str] = mapped_column(Text, nullable=False)
    follow_up_recommendation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    appointment: Mapped["Appointment"] = relationship("Appointment", back_populates="treatment_record")
    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="treatment_records")
    doctor: Mapped["DoctorProfile"] = relationship("DoctorProfile", back_populates="treatment_records")


class Prescription(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "prescriptions"

    appointment_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patient_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctor_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_finalized: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    appointment: Mapped[Optional["Appointment"]] = relationship("Appointment", back_populates="prescriptions")
    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="prescriptions")
    doctor: Mapped["DoctorProfile"] = relationship("DoctorProfile", back_populates="prescriptions")
    items: Mapped[List["PrescriptionItem"]] = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")


class PrescriptionItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "prescription_items"

    prescription_id: Mapped[str] = mapped_column(String(36), ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), nullable=False)  # E.g. '500 mg' or '1 Tab'
    timing: Mapped[str] = mapped_column(String(100), nullable=False)  # E.g. 'TID (After Food)'
    duration: Mapped[str] = mapped_column(String(100), nullable=False)  # E.g. '5 Days'
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    prescription: Mapped["Prescription"] = relationship("Prescription", back_populates="items")
