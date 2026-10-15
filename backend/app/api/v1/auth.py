from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp_code,
    hash_otp_code,
    verify_otp_code,
)
from app.core.dependencies import get_current_user, require_patient
from app.models.base import ensure_utc
from app.models.user import User, UserRole, OtpCode, RefreshToken
from app.models.profile import PatientProfile, DoctorProfile, StaffProfile
from app.schemas.auth import (
    OtpRequest,
    OtpRequestResponse,
    OtpVerifyRequest,
    AuthTokenResponse,
    PatientRegisterRequest,
    StaffLoginRequest,
    RefreshTokenRequest,
    UserProfileResponse,
    UpdateProfileRequest,
)

router = APIRouter()


def _normalize_phone(phone: str) -> str:
    cleaned = "".join(ch for ch in phone if ch.isalnum() or ch == "+")
    if not cleaned.startswith("+"):
        if len(cleaned) == 10:
            cleaned = "+91" + cleaned
        else:
            cleaned = "+" + cleaned
    return cleaned


@router.post("/otp/request", response_model=OtpRequestResponse, status_code=status.HTTP_200_OK)
def request_otp(payload: OtpRequest, db: Session = Depends(get_db)):
    """Request a 6-digit phone verification OTP code."""
    phone = _normalize_phone(payload.phone)
    if len(phone) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number format. Please provide a valid phone number.",
        )

    # Enforce: Only pre-registered patients by doctor can request login OTP
    existing_user = db.query(User).filter(User.phone == phone, User.role == UserRole.PATIENT.value).first()
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This phone number is not registered with Kumar Dental Clinic. Only your doctor can register your number. Please contact the clinic to be registered."
        )

    # Invalidate previous unconsumed OTPs for this phone
    now = datetime.now(timezone.utc)
    db.query(OtpCode).filter(
        OtpCode.phone == phone,
        OtpCode.consumed_at.is_(None)
    ).update({"consumed_at": now})

    # Generate new cryptographically secure code
    plain_code = generate_otp_code()
    hashed = hash_otp_code(phone, plain_code)
    expires_at = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    otp_record = OtpCode(
        phone=phone,
        code_hash=hashed,
        purpose=payload.purpose,
        attempts=0,
        expires_at=expires_at
    )
    db.add(otp_record)
    db.commit()

    # In dev or demo mode with mock enabled, return code in response for rapid testing
    dev_otp = plain_code if settings.DEV_OTP_MOCK else None

    return OtpRequestResponse(
        message="Verification code sent successfully.",
        phone=phone,
        expires_in_seconds=settings.OTP_EXPIRE_MINUTES * 60,
        dev_otp=dev_otp
    )


@router.post("/otp/verify", response_model=AuthTokenResponse, status_code=status.HTTP_200_OK)
def verify_otp(payload: OtpVerifyRequest, db: Session = Depends(get_db)):
    """Verify phone OTP and issue authentication session tokens."""
    phone = _normalize_phone(payload.phone)
    now = datetime.now(timezone.utc)

    otp_record = (
        db.query(OtpCode)
        .filter(OtpCode.phone == phone, OtpCode.consumed_at.is_(None))
        .order_by(OtpCode.created_at.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification code found for this phone. Please request a new code.",
        )

    if ensure_utc(otp_record.expires_at) < now:
        otp_record.consumed_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code.",
        )

    if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
        otp_record.consumed_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum verification attempts exceeded. Please request a new code.",
        )

    is_mock_code = settings.DEV_OTP_MOCK and (payload.code == "123456" or payload.code == "111111")
    if not is_mock_code and not verify_otp_code(phone, payload.code, otp_record.code_hash):
        otp_record.attempts += 1
        db.commit()
        remaining = settings.OTP_MAX_ATTEMPTS - otp_record.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect verification code. {remaining} attempt(s) remaining.",
        )

    # Mark OTP as consumed
    otp_record.consumed_at = now

    # Find pre-registered patient user (only doctor can register patient in database)
    user = db.query(User).filter(User.phone == phone, User.role == UserRole.PATIENT.value).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient record not found. Only your doctor can register your number in the database."
        )

    user.is_verified = True
    is_new_user = False

    # Generate session tokens
    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        extra_claims={"phone": user.phone}
    )
    refresh_token = create_refresh_token(subject=user.id)

    # Persist refresh token hash
    rf_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_otp_code(user.id, refresh_token[:16]),
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(rf_record)
    db.commit()

    profile_data = None
    if user.patient_profile:
        profile_data = {
            "first_name": user.patient_profile.first_name,
            "last_name": user.patient_profile.last_name,
            "patient_id": user.patient_profile.id
        }

    return AuthTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        role=user.role,
        is_new_user=is_new_user,
        profile=profile_data
    )


@router.post("/patient/register", status_code=status.HTTP_201_CREATED)
def register_patient_profile(
    payload: PatientRegisterRequest,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """Complete or update profile for authenticated patient."""
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()

    if profile:
        profile.first_name = payload.first_name
        profile.last_name = payload.last_name
        profile.date_of_birth = payload.date_of_birth
        profile.gender = payload.gender
        profile.blood_group = payload.blood_group
        profile.emergency_contact_name = payload.emergency_contact_name
        profile.emergency_contact_phone = payload.emergency_contact_phone
        profile.allergies = payload.allergies
        profile.address = payload.address
        profile.city = payload.city
    else:
        profile = PatientProfile(
            user_id=current_user.id,
            first_name=payload.first_name,
            last_name=payload.last_name,
            date_of_birth=payload.date_of_birth,
            gender=payload.gender,
            blood_group=payload.blood_group,
            emergency_contact_name=payload.emergency_contact_name,
            emergency_contact_phone=payload.emergency_contact_phone,
            allergies=payload.allergies,
            address=payload.address,
            city=payload.city
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)
    return {
        "message": "Patient profile saved successfully.",
        "patient_id": profile.id,
        "first_name": profile.first_name,
        "last_name": profile.last_name
    }


@router.post("/staff/login", response_model=AuthTokenResponse, status_code=status.HTTP_200_OK)
def staff_login(payload: StaffLoginRequest, db: Session = Depends(get_db)):
    """Authenticate clinic staff (Admin, Receptionist, Doctor) via email and password."""
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()

    # Never disclose whether email exists; generic error message prevents enumeration
    invalid_credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password. Please check your credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not user or not user.password_hash:
        raise invalid_credentials_exc

    if user.role == UserRole.PATIENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient accounts must sign in using the Patient Mobile Application.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff account is deactivated. Contact clinic administrator.",
        )

    if not verify_password(payload.password, user.password_hash):
        raise invalid_credentials_exc

    now = datetime.now(timezone.utc)
    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        extra_claims={"email": user.email}
    )
    refresh_token = create_refresh_token(subject=user.id)

    # Persist refresh token
    rf_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_otp_code(user.id, refresh_token[:16]),
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(rf_record)
    db.commit()

    profile_data = {}
    if user.role == UserRole.DOCTOR.value and user.doctor_profile:
        profile_data = {
            "doctor_id": user.doctor_profile.id,
            "full_name": user.doctor_profile.full_name,
            "specialization": user.doctor_profile.specialization
        }
    elif user.staff_profile:
        profile_data = {
            "full_name": user.staff_profile.full_name,
            "department": user.staff_profile.department
        }

    return AuthTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        role=user.role,
        is_new_user=False,
        profile=profile_data
    )


@router.post("/refresh", response_model=AuthTokenResponse, status_code=status.HTTP_200_OK)
def refresh_session(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a fresh access token."""
    try:
        claims = decode_token(payload.refresh_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    if claims.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type provided.",
        )

    user_id = claims.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer active.",
        )

    # Check for active non-revoked refresh token record
    token_hash = hash_otp_code(user_id, payload.refresh_token[:16])
    rf_record = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked.is_(False)
    ).first()

    if not rf_record or ensure_utc(rf_record.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token revoked or expired.",
        )

    new_access_token = create_access_token(
        subject=user.id,
        role=user.role,
        extra_claims={"email": user.email, "phone": user.phone}
    )

    return AuthTokenResponse(
        access_token=new_access_token,
        refresh_token=payload.refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        role=user.role
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Revoke all active refresh tokens for the current user."""
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.revoked.is_(False)
    ).update({"revoked": True})
    db.commit()
    return {"message": "Logged out successfully. Active sessions revoked."}


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get authenticated user identity and profile details."""
    profile_data = None
    if current_user.role == UserRole.PATIENT.value and current_user.patient_profile:
        p = current_user.patient_profile
        profile_data = {
            "patient_id": p.id,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "full_name": p.full_name,
            "date_of_birth": p.date_of_birth.isoformat() if p.date_of_birth else None,
            "gender": p.gender,
            "blood_group": p.blood_group,
            "emergency_contact_name": p.emergency_contact_name,
            "emergency_contact_phone": p.emergency_contact_phone,
            "allergies": p.allergies,
            "address": p.address,
            "city": p.city
        }
    elif current_user.role == UserRole.DOCTOR.value and current_user.doctor_profile:
        d = current_user.doctor_profile
        profile_data = {
            "doctor_id": d.id,
            "full_name": d.full_name,
            "qualification": d.qualification,
            "registration_number": d.registration_number,
            "specialization": d.specialization,
            "experience_years": d.experience_years,
            "bio": d.bio
        }
    elif current_user.staff_profile:
        s = current_user.staff_profile
        profile_data = {
            "staff_id": s.id,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "full_name": s.full_name,
            "department": s.department
        }

    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        phone=current_user.phone,
        role=current_user.role,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        profile=profile_data
    )


@router.patch("/me/profile", status_code=status.HTTP_200_OK)
def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile fields allowed for self-service."""
    if current_user.role == UserRole.PATIENT.value and current_user.patient_profile:
        p = current_user.patient_profile
        if payload.first_name: p.first_name = payload.first_name
        if payload.last_name: p.last_name = payload.last_name
        if payload.gender: p.gender = payload.gender
        if payload.blood_group: p.blood_group = payload.blood_group
        if payload.emergency_contact_name: p.emergency_contact_name = payload.emergency_contact_name
        if payload.emergency_contact_phone: p.emergency_contact_phone = payload.emergency_contact_phone
        if payload.allergies: p.allergies = payload.allergies
        if payload.address: p.address = payload.address
        if payload.city: p.city = payload.city
        db.commit()
        return {"message": "Profile updated successfully."}
    elif current_user.staff_profile:
        s = current_user.staff_profile
        if payload.first_name: s.first_name = payload.first_name
        if payload.last_name: s.last_name = payload.last_name
        db.commit()
        return {"message": "Staff profile updated successfully."}
    
    raise HTTPException(status_code=400, detail="Profile record not found to update.")
