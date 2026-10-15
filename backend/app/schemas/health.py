from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok", json_schema_extra={"example": "ok"})
    version: str = Field(default="1.0.0", json_schema_extra={"example": "1.0.0"})
    timestamp: datetime
    environment: str = Field(default="development", json_schema_extra={"example": "development"})


class ReadinessResponse(BaseModel):
    status: str = Field(default="ready", json_schema_extra={"example": "ready"})
    database: str = Field(default="connected", json_schema_extra={"example": "connected"})
    storage: str = Field(default="configured", json_schema_extra={"example": "configured"})
    timestamp: datetime


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
