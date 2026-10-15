import pytest
from app.core.config import Settings


def test_production_guard_fails_when_dev_otp_mock_true():
    settings = Settings(
        ENVIRONMENT="production",
        DEV_OTP_MOCK=True,
        JWT_SECRET="valid_production_secret_key_exceeding_32_characters"
    )
    with pytest.raises(ValueError, match="CRITICAL SECURITY VIOLATION: DEV_OTP_MOCK cannot be True in production!"):
        settings.validate_production_guards()


def test_production_guard_fails_when_insecure_jwt_secret():
    settings = Settings(
        ENVIRONMENT="production",
        DEV_OTP_MOCK=False,
        JWT_SECRET="kumar_dental_jwt_secret_change_me_in_production_min_32_chars"
    )
    with pytest.raises(ValueError, match="CRITICAL SECURITY VIOLATION: Insecure default JWT_SECRET"):
        settings.validate_production_guards()


def test_production_guard_passes_with_safe_config():
    settings = Settings(
        ENVIRONMENT="production",
        DEV_OTP_MOCK=False,
        JWT_SECRET="secure_random_production_key_49662c7a_d175_4d19_ac97_f43aaf431981"
    )
    # Should not raise exception
    settings.validate_production_guards()
