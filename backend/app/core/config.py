from typing import List, Literal, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # General
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    PROJECT_NAME: str = "Kumar Dental Clinic API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081,http://127.0.0.1:8081"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://kumar_admin:kumar_secure_password_123@localhost:5432/kumar_dental_db",
        description="Database connection URL"
    )

    # JWT Authentication
    JWT_SECRET: str = Field(
        default="kumar_dental_jwt_secret_change_me_in_production_min_32_chars",
        min_length=32,
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Phone OTP
    DEV_OTP_MOCK: bool = True
    OTP_EXPIRE_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 3

    # Private Storage (S3 / MinIO)
    STORAGE_ENDPOINT_URL: Optional[str] = None
    STORAGE_ACCESS_KEY: Optional[str] = None
    STORAGE_SECRET_KEY: Optional[str] = None
    STORAGE_BUCKET_NAME: str = "kumar-dental-private-documents"
    STORAGE_REGION: str = "ap-south-1"
    STORAGE_SIGNED_URL_EXPIRY_SECONDS: int = 900  # 15 minutes

    # Notifications
    SMS_PROVIDER: Literal["mock", "twilio", "gupshup"] = "mock"
    EMAIL_PROVIDER: Literal["mock", "smtp", "resend"] = "mock"
    WHATSAPP_PROVIDER: Literal["mock", "meta", "gupshup"] = "mock"
    EXPO_PUSH_ACCESS_TOKEN: Optional[str] = None

    # Clinic Defaults
    CLINIC_TIMEZONE: str = "Asia/Kolkata"
    CLINIC_NAME: str = "Kumar Dental Clinic"
    CLINIC_PHONE_PRIMARY: str = "+919824037497"
    CLINIC_PHONE_SECONDARY: str = "+919512037497"
    CLINIC_LANDLINE: str = "+912652314153"
    CLINIC_ADDRESS: str = "A-6, Yogeshwar Jyot Society, Near Mother's School, Gotri, Vadodara - 390021, Gujarat, India"

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    @field_validator("DEV_OTP_MOCK")
    @classmethod
    def validate_dev_otp_mock(cls, v: bool, info) -> bool:
        # In production, DEV_OTP_MOCK must NEVER be True! Fail closed!
        return v

    def validate_production_guards(self) -> None:
        if self.ENVIRONMENT == "production":
            if self.DEV_OTP_MOCK:
                raise ValueError("CRITICAL SECURITY VIOLATION: DEV_OTP_MOCK cannot be True in production!")
            if "change_me" in self.JWT_SECRET:
                raise ValueError("CRITICAL SECURITY VIOLATION: Insecure default JWT_SECRET detected in production!")


settings = Settings()
