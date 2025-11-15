# Local Development Guide

This guide sets up a Postgres-backed local environment with Docker and configures required environment variables.

## Prerequisites
- Docker Desktop for Windows (running)
- Python 3.11+

## Start the Database
1. From the project root, run:
   - `docker compose up -d`
   - Verify port mapping: `docker port nectar_postgres` should show `5433`
2. Optional: Open Adminer at `http://localhost:8080` and connect:
   - System: `PostgreSQL`
   - Server: `postgres`
   - Username: `nectar`
   - Password: `nectar`
   - Database: `nectar`

## Configure Environment
1. Copy `.env.example` to `.env` and keep defaults, or adjust.
2. Minimum required variables:
   - `DATABASE_URL=postgresql+asyncpg://nectar:nectar@127.0.0.1:5433/nectar`
   - `SECRET_KEY=change_me_dev_secret`
   - `WP_SYNC_ENABLED=false` to disable WordPress sync in dev.
   - If `WP_SYNC_ENABLED=true`, then `WP_USERNAME` and `WP_APP_PASSWORD` must be set.

## Install Dependencies
- `pip install -r requirements.txt`

## Run the API Server (Windows PowerShell)
```powershell
$env:DATABASE_URL = 'postgresql+asyncpg://nectar:nectar@127.0.0.1:5433/nectar'
$env:SECRET_KEY = 'change_me_dev_secret'
$env:WP_SYNC_ENABLED = 'false'
$env:WP_USERNAME = 'placeholder'
$env:WP_APP_PASSWORD = 'placeholder'
uvicorn main:app --reload
```

On startup, the app creates tables automatically via `Base.metadata.create_all`.

## SQLite Fallback (Optional)
For quick smoke tests without Docker, set:
- `DATABASE_URL=sqlite+aiosqlite:///./dev.db`

The app will use `JSON` column types on SQLite and `JSONB` on Postgres automatically.

## Seed Admin User
Create or update a local admin account for testing auth:

- `python scripts/seed_admin.py`

Optional overrides (Windows PowerShell):
```powershell
$env:ADMIN_USERNAME = 'admin'
$env:ADMIN_EMAIL = 'admin@example.com'
$env:ADMIN_PASSWORD = 'NectarDev123!'
$env:ADMIN_ROLE = 'propertyadmin'
python scripts/seed_admin.py
```

Login with `POST /token` (form data: `username`, `password`) to get a JWT. Then call `GET /users/me` with `Authorization: Bearer <token>`.