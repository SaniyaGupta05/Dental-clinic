from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr


class OtpRequest(BaseModel):
    phone: str = Field(..., description="Phone number formatted as E.164 (e.g. +919824037497)")
    purpose: str = Field(default="LOGIN", description="Purpose: LOGIN or REGISTER")


class OtpRequestResponse(BaseModel):
    message: str
    phone: str
    expires_in_seconds: int
    # dev_otp is ONLY included when DEV_OTP_MOCK is True in development mode
    dev_otp: Optional[str] = None


class OtpVerifyRequest(BaseModel):
    phone: str
    code: str = Field(..., min_length=6, max_length=6, description="6-digit numeric OTP code")


class StaffLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    role: str
    is_new_user: bool = False
    profile: Optional[dict] = None


class PatientRegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    allergies: Optional[str] = None
    address: Optional[str] = None
    city: str = "Vadodara"


class UserProfileResponse(BaseModel):
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool
    profile: Optional[dict] = None


class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    allergies: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
