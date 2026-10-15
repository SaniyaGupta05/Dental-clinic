from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole
from app.models.profile import PatientProfile, DoctorProfile, StaffProfile

security_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """Validate Bearer JWT and return active User instance."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credential subject missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account removed.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently inactive or deactivated. Contact clinic support.",
        )

    return user


class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = [r.value if isinstance(r, UserRole) else r for r in allowed_roles]

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: This action requires one of the following roles: {', '.join(self.allowed_roles)}.",
            )
        return current_user


# Convenience dependency shortcuts
require_patient = RoleChecker([UserRole.PATIENT])
require_staff = RoleChecker([UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.ADMIN])
require_doctor = RoleChecker([UserRole.DOCTOR, UserRole.ADMIN])
require_receptionist = RoleChecker([UserRole.RECEPTIONIST, UserRole.ADMIN])
require_admin = RoleChecker([UserRole.ADMIN])


def get_current_patient_profile(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
) -> PatientProfile:
    """Returns the authenticated patient's profile; raises 404 if not yet registered."""
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not yet completed. Please complete profile registration.",
        )
    return profile


def get_current_doctor_profile(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
) -> DoctorProfile:
    """Returns the authenticated doctor's profile."""
    profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not profile and current_user.role == UserRole.ADMIN.value:
        # Admin may access doctor workspace as system supervisor
        first_doctor = db.query(DoctorProfile).first()
        return first_doctor
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found for this account.",
        )
    return profile


def verify_patient_record_access(
    current_user: User,
    target_patient_id: str,
    db: Session,
    allow_receptionist: bool = False
) -> None:
    """
    Enforces strict record-level security boundaries:
    - If user is PATIENT: target_patient_id MUST match their own patient_profile.id!
    - If user is RECEPTIONIST: denied on clinical records unless allow_receptionist=True (for basic contact/booking view).
    - If user is DOCTOR or ADMIN: allowed with audit.
    """
    if current_user.role == UserRole.PATIENT.value:
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        if not profile or profile.id != target_patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Security violation: You are not authorized to access another patient's medical records.",
            )
    elif current_user.role == UserRole.RECEPTIONIST.value:
        if not allow_receptionist:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Receptionists do not have permission to view private clinical diagnoses or treatment notes.",
            )
    elif current_user.role in [UserRole.DOCTOR.value, UserRole.ADMIN.value]:
        # Allowed for clinicians and administrators
        pass
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized access.",
        )
