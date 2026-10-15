# Deployment & Operational Guide — Kumar Dental Clinic Platform

This guide documents the production deployment architecture, environment configurations, database maintenance, backup procedures, and operational readiness for Kumar Dental Clinic.

---

## 1. Production Architecture Overview

```
                      [ Cloudflare / Route 53 DNS ]
                                    │
                                    ▼
                      [ Ingress / SSL Reverse Proxy ]
                        (Nginx / Caddy / AWS ALB)
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
[ Next.js Clinic Dashboard ]                     [ FastAPI Backend API ]
   (Vercel / Docker ECS)                           (Docker ECS / Fly.io)
            │                                               │
            │                                 ┌─────────────┴─────────────┐
            ▼                                 ▼                           ▼
[ Mobile App (Expo / React Native) ]   [ Managed PostgreSQL ]     [ S3 / MinIO Storage ]
   (Google Play / Apple App Store)       (AWS RDS / Supabase)       (Dental X-Rays / Rx)
```

---

## 2. Docker Compose Local & Staging Setup

The platform includes a containerized development and staging configuration in `infra/docker-compose.yml`:

```bash
# Start all infrastructure (PostgreSQL, MinIO S3, Backend, Web Dashboard)
cd infra
docker compose up -d

# Run database migrations
docker compose exec backend alembic upgrade head

# Seed initial clinic data (doctors, services, admin)
docker compose exec backend python -m app.core.seed
```

### Services Included:
- **`postgres`**: PostgreSQL 16 Alpine with health check probe
- **`minio`**: S3-compatible private object storage for dental X-rays & clinical PDFs
- **`backend`**: FastAPI ASGI server with auto-reloading
- **`dashboard`**: Next.js App Router production container

---

## 3. Environment Configuration Templates

### Backend (`backend/.env`)
| Variable | Description | Production Example |
| :--- | :--- | :--- |
| `ENV` | Environment (`development`, `staging`, `production`) | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+psycopg://user:pass@db.rds.amazonaws.com:5432/kumar_dental` |
| `JWT_SECRET_KEY` | 64+ char cryptographically secure random key | `openssl rand -hex 64` |
| `DEV_OTP_MOCK` | In-memory dev OTP toggle | **`false`** *(enforced fail-closed in production)* |
| `SMS_PROVIDER` | SMS gateway provider (`mock`, `twilio`, `fast2sms`) | `fast2sms` |
| `S3_ENDPOINT_URL` | Object storage endpoint | `https://s3.ap-south-1.amazonaws.com` |
| `S3_BUCKET_NAME` | S3 bucket for private documents | `kumar-dental-patient-docs-prod` |

### Web Dashboard (`apps/clinic-dashboard/.env.local`)
| Variable | Description | Production Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Public backend API URL | `https://api.kumardentalclinic.com/api/v1` |

### Mobile App (`apps/patient-mobile/.env`)
| Variable | Description | Production Example |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | Public backend API URL | `https://api.kumardentalclinic.com/api/v1` |

---

## 4. Database Migrations & Backup Strategy

### Running Migrations
```bash
cd backend
alembic upgrade head
```

### Automated Backup Script (PostgreSQL)
Run nightly via cron or AWS RDS automated snapshots:
```bash
pg_dump -U postgres -h <host> -d kumar_dental -F c -b -v -f "/backups/kumar_dental_$(date +%Y%m%d_%H%M%S).dump"
```

### Disaster Recovery / Restore
```bash
pg_restore -U postgres -h <host> -d kumar_dental -v "/backups/kumar_dental_20261014.dump"
```

---

## 5. Health & Monitoring Endpoints

- **Liveness probe**: `GET /api/v1/health` (Returns status 200 `{ status: "ok" }`)
- **Readiness probe**: `GET /api/v1/readiness` (Checks active PostgreSQL database connectivity)
- **API Documentation**: `GET /docs` (OpenAPI Swagger UI, disabled or gated in production)
