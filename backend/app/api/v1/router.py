from typing import List
from fastapi import APIRouter
from app.api.v1 import (
    auth,
    services,
    availability,
    appointments,
    clinical,
    documents,
    notifications,
    admin,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.add_api_route("/me", auth.get_current_user_profile, methods=["GET"], response_model=auth.UserProfileResponse, tags=["Authentication"])
api_router.add_api_route("/patients/me/documents", documents.get_my_documents, methods=["GET"], response_model=List[documents.DocumentResponse], tags=["Medical Documents"])
api_router.add_api_route("/patients/me/records", clinical.get_my_records, methods=["GET"], tags=["Clinical Records & Prescriptions"])
api_router.include_router(services.router, prefix="/services", tags=["Services & Doctors"])
api_router.include_router(availability.router, prefix="/availability", tags=["Availability"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
api_router.include_router(clinical.router, prefix="/clinical", tags=["Clinical Records & Prescriptions"])
api_router.include_router(documents.router, prefix="/documents", tags=["Medical Documents"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications & Follow-ups"])
api_router.include_router(admin.router, prefix="/admin", tags=["Clinic Administration & Settings"])

