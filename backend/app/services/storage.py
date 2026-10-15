import os
import uuid
import mimetypes
from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "image/tiff": ".tiff"
}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


class DocumentStorageService:
    def __init__(self):
        self.endpoint_url = settings.STORAGE_ENDPOINT_URL
        self.bucket_name = settings.STORAGE_BUCKET_NAME
        self.access_key = settings.STORAGE_ACCESS_KEY
        self.secret_key = settings.STORAGE_SECRET_KEY
        self.region = settings.STORAGE_REGION

        # Local fallback directory when S3/MinIO is not connected
        self.local_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "private_docs")
        os.makedirs(self.local_dir, exist_ok=True)

        self._s3_client = None
        if self.endpoint_url and self.access_key and self.secret_key:
            try:
                self._s3_client = boto3.client(
                    "s3",
                    endpoint_url=self.endpoint_url,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region,
                    config=Config(
                        signature_version="s3v4",
                        connect_timeout=1,
                        read_timeout=1,
                        retries={"max_attempts": 1}
                    )
                )
            except Exception:
                self._s3_client = None

    def validate_file(self, file: UploadFile) -> str:
        """Validate file mime type and file size."""
        content_type = file.content_type or mimetypes.guess_type(file.filename)[0]
        if not content_type or content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type '{content_type}'. Allowed types: JPG, PNG, WEBP, PDF, TIFF.",
            )
        return content_type

    async def save_file(self, file: UploadFile, patient_id: str) -> Tuple[str, int, str]:
        """
        Saves file to private storage and returns (s3_key, file_size_bytes, mime_type).
        """
        mime_type = self.validate_file(file)
        ext = ALLOWED_MIME_TYPES.get(mime_type, ".bin")
        s3_key = f"patients/{patient_id}/{uuid.uuid4().hex}_{file.filename}"

        content = await file.read()
        file_size = len(content)

        if file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed limit of 25MB (File size: {file_size / (1024*1024):.2f}MB).",
            )

        if self._s3_client:
            try:
                self._s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=content,
                    ContentType=mime_type,
                    ServerSideEncryption="AES256"
                )
                return s3_key, file_size, mime_type
            except Exception as e:
                print(f"S3 upload error, falling back to secure local store: {e}")

        # Local storage fallback
        local_path = os.path.join(self.local_dir, s3_key.replace("/", "_"))
        with open(local_path, "wb") as f:
            f.write(content)

        return s3_key, file_size, mime_type

    def _local_path(self, s3_key: str) -> str:
        return os.path.join(self.local_dir, s3_key.replace("/", "_"))

    def delete_file(self, s3_key: str) -> bool:
        """Deletes file from S3 bucket and local storage fallback."""
        deleted = False
        if self._s3_client:
            try:
                self._s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
                deleted = True
            except Exception as e:
                print(f"Error deleting from S3: {e}")

        local_path = self._local_path(s3_key)
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
                deleted = True
            except Exception as e:
                print(f"Error deleting local file: {e}")

        return deleted

    def generate_presigned_download_url(
        self,
        s3_key: str,
        original_filename: str = "document.pdf",
        base_url: Optional[str] = None,
    ) -> str:
        """
        Generates short-lived signed download URL (15 minutes expiry) with Content-Disposition header.

        base_url: public origin of this API as seen by the caller (e.g. http://192.168.1.47:8000),
        so the link works on both the web dashboard and physical phones.
        """
        # Files saved via the local fallback (S3/MinIO unreachable at upload time) do not exist
        # in the bucket, so a bucket presigned URL would be dead. Serve them from local storage.
        stored_locally = os.path.exists(self._local_path(s3_key))

        if self._s3_client and not stored_locally:
            try:
                url = self._s3_client.generate_presigned_url(
                    "get_object",
                    Params={
                        "Bucket": self.bucket_name,
                        "Key": s3_key,
                        "ResponseContentDisposition": f'inline; filename="{original_filename}"'
                    },
                    ExpiresIn=settings.STORAGE_SIGNED_URL_EXPIRY_SECONDS
                )
                return url
            except ClientError as e:
                print(f"Presigned URL generation error: {e}")

        # Fallback signed download URL pointing to API streaming endpoint
        import hmac, hashlib
        from urllib.parse import urlencode
        expiry = int((datetime.now(timezone.utc) + timedelta(seconds=settings.STORAGE_SIGNED_URL_EXPIRY_SECONDS)).timestamp())
        sig = hmac.new(settings.JWT_SECRET.encode(), f"{s3_key}:{expiry}".encode(), hashlib.sha256).hexdigest()
        origin = (base_url or "http://192.168.1.47:8000").rstrip("/")
        query = urlencode({"key": s3_key, "expires": expiry, "sig": sig})
        return f"{origin}{settings.API_V1_PREFIX}/documents/stream?{query}"


storage_service = DocumentStorageService()
