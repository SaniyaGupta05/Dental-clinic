from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DocumentResponse(BaseModel):
    id: str
    patient_id: str
    document_type: str
    file_name: str
    title: Optional[str] = None
    mime_type: str
    file_size_bytes: int
    is_patient_visible: bool
    quarantine_status: str
    description: Optional[str] = None
    download_url: Optional[str] = None
    created_at: datetime


class DownloadUrlResponse(BaseModel):
    document_id: str
    file_name: str
    mime_type: str
    download_url: str
    expires_in_seconds: int
