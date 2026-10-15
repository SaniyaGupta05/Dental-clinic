from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.service import Service
from app.models.profile import DoctorProfile
from app.schemas.service import ServiceResponse, DoctorSummary

router = APIRouter()


@router.get("", response_model=List[ServiceResponse])
def list_services(db: Session = Depends(get_db)):
    """List all active dental services with verified descriptions and durations."""
    return (
        db.query(Service)
        .filter(Service.is_active.is_(True))
        .order_by(Service.display_order.asc(), Service.name.asc())
        .all()
    )


@router.get("/doctors", response_model=List[DoctorSummary])
def list_doctors(db: Session = Depends(get_db)):
    """List active clinic dentists and dental surgeons."""
    return (
        db.query(DoctorProfile)
        .filter(DoctorProfile.is_active.is_(True))
        .order_by(DoctorProfile.experience_years.desc())
        .all()
    )


@router.get("/{service_id}", response_model=ServiceResponse)
def get_service_detail(service_id: str, db: Session = Depends(get_db)):
    """Retrieve detailed information for a specific dental service."""
    service = db.query(Service).filter(Service.id == service_id, Service.is_active.is_(True)).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dental service not found.")
    return service
