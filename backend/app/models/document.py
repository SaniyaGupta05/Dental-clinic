import enum
from typing import Optional
from sqlalchemy import String, Boolean, BigInteger, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class DocumentType(str, enum.Enum):
    X_RAY = "X_RAY"
    LAB_REPORT = "LAB_REPORT"
    PRESCRIPTION_SCAN = "PRESCRIPTION_SCAN"
    CLINICAL_PHOTO = "CLINICAL_PHOTO"
    OTHER = "OTHER"


class QuarantineStatus(str, enum.Enum):
    CLEAN = "CLEAN"
    PENDING_SCAN = "PENDING_SCAN"
    INFECTED = "INFECTED"


class PatientDocument(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "patient_documents"

    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    
    document_type: Mapped[str] = mapped_column(String(50), default=DocumentType.X_RAY.value, nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    s3_key: Mapped[str] = mapped_column(String(500), unique=True, index=True, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    is_patient_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    quarantine_status: Mapped[str] = mapped_column(String(30), default=QuarantineStatus.CLEAN.value, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="documents")
    uploaded_by: Mapped["User"] = relationship("User")
