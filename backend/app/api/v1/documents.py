import os
import hmac
import hashlib
import mimetypes
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_patient, require_doctor, verify_patient_record_access
from app.models.user import User, UserRole
from app.models.profile import PatientProfile
from app.models.document import PatientDocument, DocumentType, QuarantineStatus
from app.models.audit import AuditLog
from app.schemas.document import DocumentResponse, DownloadUrlResponse
from app.services.storage import storage_service

router = APIRouter()


def _origin(request: Request) -> str:
    """Public origin of the API as the caller reached it (works for web and phones on LAN)."""
    return str(request.base_url).rstrip("/")


@router.post("/patients/{patient_id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_patient_document(
    patient_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(default=DocumentType.X_RAY.value),
    description: Optional[str] = Form(None),
    is_patient_visible: bool = Form(default=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Securely upload a patient dental document, X-ray, or lab report to private storage.
    """
    patient = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found.")

    # Authorization: patient can only upload for self; staff can upload for any patient
    verify_patient_record_access(current_user, patient_id, db, allow_receptionist=True)

    # Save file to storage
    s3_key, file_size, mime_type = await storage_service.save_file(file, patient_id)

    doc = PatientDocument(
        patient_id=patient_id,
        uploaded_by_id=current_user.id,
        document_type=document_type,
        file_name=file.filename,
        s3_key=s3_key,
        mime_type=mime_type,
        file_size_bytes=file_size,
        is_patient_visible=is_patient_visible,
        quarantine_status=QuarantineStatus.CLEAN.value,
        description=description
    )
    db.add(doc)

    audit = AuditLog(
        actor_id=current_user.id,
        action="UPLOAD_DOCUMENT",
        target_type="patient_document",
        target_id=doc.id,
        metadata_json={"patient_id": patient_id, "file_name": file.filename, "document_type": document_type}
    )
    db.add(audit)
    db.commit()
    db.refresh(doc)

    return DocumentResponse(
        id=doc.id,
        patient_id=doc.patient_id,
        document_type=doc.document_type,
        file_name=doc.file_name,
        mime_type=doc.mime_type,
        file_size_bytes=doc.file_size_bytes,
        is_patient_visible=doc.is_patient_visible,
        quarantine_status=doc.quarantine_status,
        description=doc.description,
        created_at=doc.created_at
    )


@router.get("/patients/me/documents", response_model=List[DocumentResponse])
def get_my_documents(
    request: Request,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """Patient retrieves their own authorized medical documents and X-rays."""
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        return []

    docs = (
        db.query(PatientDocument)
        .filter(
            PatientDocument.patient_id == profile.id,
            PatientDocument.is_patient_visible.is_(True),
            PatientDocument.quarantine_status == QuarantineStatus.CLEAN.value
        )
        .order_by(PatientDocument.created_at.desc())
        .all()
    )

    return [
        DocumentResponse(
            id=d.id,
            patient_id=d.patient_id,
            document_type=d.document_type,
            file_name=d.file_name,
            title=d.file_name,
            mime_type=d.mime_type,
            file_size_bytes=d.file_size_bytes,
            is_patient_visible=d.is_patient_visible,
            quarantine_status=d.quarantine_status,
            description=d.description,
            download_url=storage_service.generate_presigned_download_url(d.s3_key, d.file_name, _origin(request)),
            created_at=d.created_at
        )
        for d in docs
    ]


@router.get("/patients/{patient_id}/documents", response_model=List[DocumentResponse])
def get_patient_documents(
    patient_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve documents for a patient (access controlled)."""
    verify_patient_record_access(current_user, patient_id, db, allow_receptionist=False)

    query = db.query(PatientDocument).filter(PatientDocument.patient_id == patient_id)

    # Patients can only see patient-visible clean files
    if current_user.role == UserRole.PATIENT.value:
        query = query.filter(
            PatientDocument.is_patient_visible.is_(True),
            PatientDocument.quarantine_status == QuarantineStatus.CLEAN.value
        )

    docs = query.order_by(PatientDocument.created_at.desc()).all()
    return [
        DocumentResponse(
            id=d.id,
            patient_id=d.patient_id,
            document_type=d.document_type,
            file_name=d.file_name,
            title=d.file_name,
            mime_type=d.mime_type,
            file_size_bytes=d.file_size_bytes,
            is_patient_visible=d.is_patient_visible,
            quarantine_status=d.quarantine_status,
            description=d.description,
            download_url=storage_service.generate_presigned_download_url(d.s3_key, d.file_name, _origin(request)),
            created_at=d.created_at
        )
        for d in docs
    ]


@router.get("/{document_id}/download-url", response_model=DownloadUrlResponse)
def get_document_download_url(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate an authenticated short-lived presigned download URL (15 minutes expiry)
    after server verifies caller permissions.
    """
    doc = db.query(PatientDocument).filter(PatientDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    verify_patient_record_access(current_user, doc.patient_id, db, allow_receptionist=False)

    if current_user.role == UserRole.PATIENT.value and not doc.is_patient_visible:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Document is restricted to clinical staff only.")

    url = storage_service.generate_presigned_download_url(doc.s3_key, doc.file_name, _origin(request))

    # Audit log entry for document view
    audit = AuditLog(
        actor_id=current_user.id,
        action="VIEW_DOCUMENT",
        target_type="patient_document",
        target_id=doc.id,
        metadata_json={"patient_id": doc.patient_id, "file_name": doc.file_name}
    )
    db.add(audit)
    db.commit()

    return DownloadUrlResponse(
        document_id=doc.id,
        file_name=doc.file_name,
        mime_type=doc.mime_type,
        download_url=url,
        expires_in_seconds=settings.STORAGE_SIGNED_URL_EXPIRY_SECONDS
    )


@router.get("/stream")
def stream_local_document(
    key: str = Query(...),
    expires: int = Query(...),
    sig: str = Query(...)
):
    """Fallback streaming endpoint for verified presigned tokens in local storage mode."""
    # Verify signature
    expected_sig = hmac.new(settings.JWT_SECRET.encode(), f"{key}:{expires}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid presigned signature.")

    now_ts = int(datetime.now(timezone.utc).timestamp())
    if expires < now_ts:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Presigned URL has expired.")

    local_path = os.path.join(storage_service.local_dir, key.replace("/", "_"))
    if not os.path.exists(local_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content not found.")

    # Strip the "patients/<id>/<uuid>_" prefix to recover the original filename.
    original_name = key.rsplit("/", 1)[-1].split("_", 1)[-1]
    media_type = mimetypes.guess_type(original_name)[0] or "application/octet-stream"
    # Inline so browsers / in-app viewers display images and PDFs instead of forcing a download.
    return FileResponse(
        local_path,
        media_type=media_type,
        filename=original_name,
        content_disposition_type="inline",
    )


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def delete_patient_document(
    document_id: str,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    """
    Delete a patient document/report/X-ray.
    STRICT SECURITY POLICY: ONLY a Doctor or Clinic Admin can delete medical records.
    Patients and Receptionists are strictly forbidden from deleting medical documents.
    """
    doc = db.query(PatientDocument).filter(PatientDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # Remove physical file from private storage
    storage_service.delete_file(doc.s3_key)

    # Medical audit log entry for record deletion
    audit = AuditLog(
        actor_id=current_user.id,
        action="DELETE_DOCUMENT",
        target_type="patient_document",
        target_id=doc.id,
        metadata_json={
            "patient_id": doc.patient_id,
            "file_name": doc.file_name,
            "document_type": doc.document_type,
            "deleted_by_role": current_user.role,
            "deleted_by_email": current_user.email
        }
    )
    db.add(audit)

    db.delete(doc)
    db.commit()

    return {
        "message": f"Medical document '{doc.file_name}' deleted successfully by Doctor.",
        "document_id": document_id
    }
