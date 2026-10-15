import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.notification import Notification, NotificationChannel, DeliveryStatus, NotificationPreference
from app.models.user import User


class NotificationService:
    def send_notification(
        self,
        db: Session,
        user_id: str,
        title: str,
        body: str,
        channel: NotificationChannel = NotificationChannel.IN_APP,
        idempotency_key: Optional[str] = None
    ) -> Notification:
        """
        Create and persist notification with idempotency check to avoid duplicate sends on retries.
        """
        if idempotency_key:
            existing = db.query(Notification).filter(Notification.idempotency_key == idempotency_key).first()
            if existing:
                return existing

        # Check preferences if exists
        pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
        if pref:
            if channel == NotificationChannel.PUSH and not pref.push_enabled:
                return None
            if channel == NotificationChannel.EMAIL and not pref.email_enabled:
                return None
            if channel == NotificationChannel.SMS and not pref.sms_enabled:
                return None
            if channel == NotificationChannel.WHATSAPP and not pref.whatsapp_enabled:
                return None

        # Create in-app record
        notification = Notification(
            user_id=user_id,
            title=title,
            body=body,
            channel=channel.value,
            delivery_status=DeliveryStatus.SENT.value,
            idempotency_key=idempotency_key
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)

        # External dispatch hook
        self._dispatch_external(channel, title, body, user_id)
        return notification

    def _dispatch_external(self, channel: NotificationChannel, title: str, body: str, user_id: str):
        # Local development / sandbox honest reporting:
        if settings.ENVIRONMENT == "development":
            print(f"[{channel.value} NOTIFICATION DISPATCHED] To User: {user_id} | Title: {title} | Body: {body}")
        else:
            # In production: invoke Expo Push API, SendGrid/SES, Twilio/Gupshup
            pass


notification_service = NotificationService()
