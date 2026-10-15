# Production Release Checklist — Kumar Dental Clinic Platform

This checklist must be reviewed and signed off prior to launching the Kumar Dental Clinic platform into production.

---

## 1. Security & Configuration Sign-Off

- [ ] **Production Guard Verification**: Ensure `ENV=production` is set in backend environment variables. Verify that the server fails to start if `DEV_OTP_MOCK=true` or if default JWT secret keys are detected.
- [ ] **Cryptographic Secrets**: Rotate `JWT_SECRET_KEY` using `openssl rand -hex 64`. Ensure no developer secrets or test passwords exist in production environment stores.
- [ ] **SMS / OTP Gateway**: Configure production Indian DLT-compliant SMS gateway (e.g. Fast2SMS / Twilio) with approved DLT registration and template IDs for OTP delivery.
- [ ] **Argon2id Staff Passwords**: Change initial default passwords for `admin@kumardentalclinic.com`, `dr.kumar@kumardentalclinic.com`, `dr.neha@kumardentalclinic.com`, and `reception@kumardentalclinic.com`.
- [ ] **CORS Origins**: Restrict backend `CORS_ORIGINS` to `https://dashboard.kumardentalclinic.com` and official domains only.
- [ ] **SSL / TLS**: Enforce HTTPS on all web endpoints with HSTS (HTTP Strict Transport Security).

---

## 2. Database & Data Integrity

- [ ] **PostgreSQL Provisioning**: Ensure PostgreSQL 15+ is running on managed cloud infrastructure with automated daily snapshots and Multi-AZ replication if required.
- [ ] **Alembic Migrations**: Run `alembic upgrade head` on the production database.
- [ ] **Database Constraints Check**: Confirm that unique constraints for slot bookings (`doctor_id`, `start_time`, `status != 'CANCELLED'`) and phone number uniqueness are active.
- [ ] **Seed Data Validation**: Ensure clinic services, verified address, and working hours match Dr. Kumar M. Tipnis's actual operating schedule.

---

## 3. Storage & Document Security

- [ ] **Private S3 Bucket**: S3 bucket `kumar-dental-patient-docs-prod` must have all public access blocked.
- [ ] **Presigned URLs**: Verify document download URLs expire after 15 minutes (900 seconds) and require patient/staff JWT authentication.
- [ ] **File Type & Size Restrictions**: Validate maximum file upload size (10 MB limit) and allowed MIME types (`image/jpeg`, `image/png`, `application/pdf`).

---

## 4. Web Dashboard Verification

- [ ] **Static Generation & Bundle**: Run `npm run build` in `apps/clinic-dashboard` to verify zero build or type check errors.
- [ ] **Role Authorization**: Verify receptionist cannot author prescriptions or clinical records; verify doctor workspace allows treatment notes and prescription writing.
- [ ] **Real-Time KPIs**: Confirm dashboard agenda displays real appointments queried directly from PostgreSQL.

---

## 5. Mobile App (Android / iOS) Verification

- [ ] **EAS Build Configuration**: Configure `eas.json` for Expo Application Services.
- [ ] **App Store & Google Play Assets**: Prepare app icon, splash screen, privacy policy URL, and store metadata matching Kumar Dental Clinic branding.
- [ ] **Push Notification Credentials**: Upload Expo Push Notification credentials or APNs / FCM service account keys.
- [ ] **Deep Linking**: Test deep links for appointment details and verification SMS.

---

## 6. Regulatory & Privacy Compliance (DPDP Act, India)

- [ ] **Clinic Privacy Notice**: Review patient consent wording with clinic management.
- [ ] **Right to Correction & Erasure**: Verify patient soft-deactivation endpoint preserves legal medical record retention requirements while revoking active access.
- [ ] **Audit Trail**: Ensure all staff access to patient records is logged in the `audit_logs` table.
