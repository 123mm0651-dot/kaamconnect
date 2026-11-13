# KaamConnect API

Node.js/Express API backed by PostgreSQL. Designed for deployment on Render using the repository-level `render.yaml`.

## Endpoints

- `GET /health` — health check
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/services`
- `POST /api/providers/apply`, `GET /api/providers/approved`, admin-only `PATCH /api/providers/:id/status`
- `POST /api/bookings`, `GET /api/bookings/mine`, `PATCH /api/bookings/:id/status`, admin-only `PATCH /api/bookings/:id/assign`

Protected endpoints require `Authorization: Bearer <JWT>`.

## Deploy

1. In Render, create a **Blueprint** from this GitHub repository, or use **New → Blueprint** and select `123mm0651-dot/kaamconnect`.
2. Render reads the root `render.yaml` and proposes a PostgreSQL database and Node web service.
3. Review the resources and deploy. Free PostgreSQL instances have limited lifetime/storage; review current Render pricing before using real customer data.
4. After deploy, open the API service URL plus `/health`.

The database schema and starter services are in `backend/sql/schema.sql`. Run the SQL against the provisioned database once before using API endpoints. Keep database credentials private.

## Local development

```bash
cd backend
npm install
cp .env.example .env
# Set DATABASE_URL and JWT_SECRET in .env
npm run dev
```

## Security / production readiness

This is an initial API foundation, not a finished production marketplace. Before public launch add email verification, password reset, stricter request validation, audit logs, automated tests, admin bootstrap through a secure one-time procedure, database backups, and security review. Do not put secrets in GitHub or frontend JavaScript.
