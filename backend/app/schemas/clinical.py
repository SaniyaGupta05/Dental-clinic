from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class PrescriptionItemCreate(BaseModel):
    medicine_name: str = Field(..., min_length=2, max_length=200)
    dosage: str = Field(..., min_length=1, max_length=100, json_schema_extra={"example": "500 mg"})
    timing: str = Field(..., min_length=1, max_length=100, json_schema_extra={"example": "TID (After Meals)"})
    duration: str = Field(..., min_length=1, max_length=100, json_schema_extra={"example": "5 Days"})
    instructions: Optional[str] = None


class PrescriptionItemResponse(BaseModel):
    id: str
    medicine_name: str
    dosage: str
    timing: str
    duration: str
    instructions: Optional[str] = None


class CreatePrescriptionRequest(BaseModel):
    patient_id: str
    appointment_id: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    items: List[PrescriptionItemCreate] = Field(..., min_length=1)


class PrescriptionResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    doctor_name: str
    appointment_id: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None
    is_finalized: bool
    created_at: datetime
    items: List[PrescriptionItemResponse] = []


class CreateTreatmentRecordRequest(BaseModel):
    tooth_number: Optional[str] = Field(None, json_schema_extra={"example": "16 (Upper Right First Molar)"})
    diagnosis: str = Field(..., min_length=3)
    clinical_notes: str = Field(..., min_length=3)
    treatment_performed: str = Field(..., min_length=3)
    follow_up_recommendation: Optional[str] = None


class TreatmentRecordResponse(BaseModel):
    id: str
    appointment_id: str
    patient_id: str
    doctor_id: str
    doctor_name: str
    tooth_number: Optional[str] = None
    diagnosis: str
    clinical_notes: str
    treatment_performed: str
    follow_up_recommendation: Optional[str] = None
    created_at: datetime
