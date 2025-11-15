# NECTAR Property Management API — Codebase Summary

This document provides an extensive, high-level summary of the codebase’s purpose, architecture, major components, data flows, external integrations, and known issues. It is intended as a quick ramp for engineers working on the backend.

## Purpose
- Backend API for a real estate/property management dashboard.
- Manages users, properties, events, payments, inventories, rooms, and items.
- Enforces JWT-based authentication and role-based permissions.
- Integrates with WordPress, syncing property profile fields using ACF-compatible payloads.
- Designed for use by a Flutter/FlutterFlow frontend.

## Architecture
- FastAPI application in `main.py` with async SQLAlchemy (`sqlalchemy.ext.asyncio`).
- Database models defined in `database.py`; async session factory via `AsyncSessionLocal`.
- Configuration via `pydantic-settings` in `config.py` (`DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`).
- Authentication helpers in `auth.py`; password hashing in `security.py` (`passlib` + `bcrypt`).
- Role/permission enforcement via dependency factory `require_permission` in `dependencies.py`.
- CRUD and business logic in `crud.py` (property creation, inventory seeding, events, payments).
- WordPress synchronization in `sync_to_wordpress.py` with ACF field mapping.
- Pydantic schemas in `schemas.py` used for request/response validation.
- Alembic migrations scaffolding in `alembic/` with `env.py` targeting `Base.metadata`.

## Key Modules
- `main.py`: FastAPI app, CORS, startup DB init, API routes.
- `database.py`: ORM models: `DBUser`, `DBProperty`, `Event`, `Payment`, `Inventory`, `Room`, `Item`, `DefaultRoom`, `DefaultItem`.
- `crud.py`: Async DB operations and orchestration (including default room/item creation and background WordPress sync).
- `auth.py`: JWT creation/verification and current-user retrieval.
- `security.py`: Password hashing/verification (`CryptContext` with `bcrypt`).
- `dependencies.py`: Permission checker dependency for section/action pairs.
- `sync_to_wordpress.py`: ACF preparation, REST API calls, and category taxonomy resolution.
- `seed_defaults.py`: One-off script to seed `DefaultRoom` and `DefaultItem`.
- `alembic/`: Migration scaffolding with `env.py` targeting `Base.metadata`.
- `requirements.txt`: Library versions and runtime assumptions.

## Data Models (database.py)
- `DBUser`
  - Fields: `id`, `username`, `email`, `hashed_password`, `role`, `is_active`, `created_at`.
  - `permissions` JSON storing section-level CRUD flags.
  - Relation: `properties` → `DBProperty`.
- `DBProperty`
  - Fields: `id`, `title`, `content`, `address`, `description`, `owner_id`, optional `wordpress_id`, audit timestamps.
  - Nested JSON fields: `tenant_info`, `financial_info`, `maintenance_records`, `documents`, `inspections` (legacy), `acf` (JSONB) storing grouped ACF-style data (e.g., `profilegroup`, `documents_group`).
  - Relations: `events` (one-to-many), `payments` (one-to-many), `inventory` (one-to-one to `Inventory`).
- `Event`
  - Property-linked timeline entries, including `incoming`/`outgoing` amounts, `status`, `incoming_date`, `outgoing_date`.
- `Payment`
  - Property-linked payments with `amount`, `category`, `type`, `status`, `due_date`, `tenant_name`, `description` and timestamps.
- `Inventory`
  - One per property; contains `rooms`.
- `Room`
  - Belongs to `Inventory`; contains `items`. Fields: `room_name`, optional `room_type`.
- `Item`
  - Belongs to `Room`; fields for `name`, `brand`, `value`, `condition`, `photos`, etc., plus `created`/`updated` timestamps.
- `DefaultRoom` / `DefaultItem`
  - Configures default structure and items used to seed new inventories.

## Schemas (schemas.py)
- User: `UserCreate`, `UserResponse` with optional `permissions`.
- Property: `PropertyCreate`, `PropertyUpdate`, `PropertyResponse`, `PropertyInspectionUpdate`.
- ACF groups: `ACFInspectionGroup`, `InventoryGroup`, `DocumentsGroupFull`, `MaintenanceGroup`, `FinancialGroup`, `TenantsGroup`, `ProfileManagement`, `ProfileGroup`, `ACFUpdate`.
- Inventory/Rooms/Items: `InventoryCreate/Response`, `RoomCreate/Response`, `ItemCreate/Response`.
- Events/Payments: `EventCreate/Response`, `PaymentCreate/Response`.
- Note: Models use `class Config: from_attributes = True`, which is a Pydantic v2 pattern.

## Authentication & Authorization
- `POST /token` issues JWT using `create_access_token` with expiration `ACCESS_TOKEN_EXPIRE_MINUTES`.
- Passwords hashed via `passlib` + `bcrypt`; verification through `security.verify_password`.
- `get_current_user` decodes JWT and loads user from DB.
- `require_permission(section, action)` dependency enforces section/action-level CRUD permissions.
  - If `role == propertyadmin`, access is allowed to all sections.
  - Otherwise, checks `current_user.permissions[section][action]`.

## API Endpoints (main.py)
- Auth & Users
  - `POST /token` → JWT login.
  - `POST /users` → create user (requires `users:create`).
  - `PUT /users/{user_id}/permissions` → update permissions (requires `users:update`).
  - `GET /users` → list active users by role (restricted to `propertyadmin`).
  - `GET /users/me` → current user profile.
- Properties
  - `GET /properties` → list with filters and sorting (e.g., `location`, `beds`).
  - `GET /properties/{property_id}` → get property with eager-loaded inventory/rooms/items.
  - `POST /properties` → create property; seeds inventory and triggers WordPress sync.
  - `PUT /properties/{property_id}` → update property fields; merges ACF in `crud.update_property`.
- Events
  - `POST /events`, `GET /events` → manage timeline events.
- Payments
  - `POST /payments`, `GET /payments`.
- Inventory, Rooms, Items
  - `POST /inventory`, `PUT /inventory/{inventory_id}` → create/update inventory tree.
  - `POST /inventory/{inventory_id}/rooms` → add room and optional items.
  - `GET /rooms/{room_id}`, `PUT /rooms/{room_id}`, `DELETE /rooms/{room_id}`.
  - `POST /rooms/{room_id}/items`, `PUT /items/{item_id}`, `DELETE /items/{item_id}`.
- Defaults
  - `GET/POST/PUT/DELETE /defaults/rooms`.
  - `GET/POST/DELETE /defaults/items`.
- Uploads
  - `POST /upload` → accepts `multipart` `files` and/or `data URLs`; saves to `uploads/` and returns absolute URLs.

## Filters and Sorting (Properties)
- Filters leverage `JSONB` paths on `DBProperty.acf['profilegroup']`:
  - `location` (string match via normalized `lower(trim(...))`).
  - `beds` (numeric compare via `cast(..., Integer)`).
- Sorting options: `created`, `title`, `location` (normalized), `beds`.
- Eager loading of `inventory.rooms.items` using `selectinload` helps prevent N+1 issues.

## WordPress Sync Integration (sync_to_wordpress.py)
- Loads `WP_USERNAME` and `WP_APP_PASSWORD` from environment.
- `prepare_acf_data` maps internal values to WordPress-allowed options for `property_type`, `furnished`, `categories`, etc.
- `sync_property_to_wordpress`:
  - Builds payload with `title`, `status`, `content`, and `fields` (for ACF REST API plugin).
  - Resolves taxonomy category ID via `get_category_id` and adds to `categories`.
  - Performs `POST` on create, `PUT` on update based on presence of `wordpress_id`.
- Hooks:
  - `on_property_created` constructs payload and calls sync.
  - `on_property_updated` performs an update or falls back to create if missing `wordpress_id`.

## Default Seeding (seed_defaults.py)
- Seeds default rooms: Bedroom, Bathroom, Kitchen.
- Seeds example default items under those rooms (e.g., Bed, Pillow, Sink, Oven).

## Uploads (main.py)
- Saves uploaded files into `uploads/` with UUID-based filenames; infers extension by MIME type for data URLs.
- Returns URLs using hardcoded base `https://dashboard.nectarestates.com/uploads/...`.
- Note: Static file hosting path is not mounted; serving `uploads/` requires either FastAPI `StaticFiles` or external web server config.

## Configuration & Migrations
- `.env` expected for `DATABASE_URL`, `SECRET_KEY`, `WP_USERNAME`, `WP_APP_PASSWORD`.
- `DATABASE_URL` for async engine should be like `postgresql+asyncpg://...`.
- Alembic `env.py` uses `Base.metadata` for autogenerate; ensure `alembic.ini` has a sync driver URL or configure async migration strategy.

## Data Flow Examples
- Login
  - Client submits `OAuth2PasswordRequestForm` to `POST /token`.
  - Server authenticates via `crud.get_user` and `security.verify_password`; returns JWT.
  - Subsequent requests include `Authorization: Bearer <token>`; routes use `auth.get_current_user` and `require_permission`.
- Create Property
  - `POST /properties` with `PropertyCreate` + optional `acf`.
  - `crud.create_property` stores property, merges `acf`, creates `Inventory`, builds default rooms/items from `profilegroup` counts.
  - Triggers `on_property_created` as background task, syncing to WordPress and persisting `wordpress_id` when available.

## Security Considerations
- CORS middleware is permissive; verify `allow_origins` configuration in production.
- JWT signing with `SECRET_KEY` and `ALGORITHM`; expiry via `ACCESS_TOKEN_EXPIRE_MINUTES`.
- Password storage uses strong hashing (`bcrypt`) via `passlib`.
- Ensure responses do not leak sensitive fields (e.g., `hashed_password` never returned).

## Testing & Tooling
- `sync_test.py` exercises WordPress sync flow using `httpx` mock scenarios for create/update actions.
- `seed_defaults.py` can be run to populate default configuration for inventories.
- No unified test suite is present; consider adding pytest-based tests for CRUD, permissions, and sync hooks.

## Known Issues and Gaps
- Dependencies aligned to Pydantic v2 (`ConfigDict`) and `pydantic-settings` v2; ensure environments use Pydantic v2 to avoid mismatches.
- JWT handling migrated to Authlib; consider RS256/JWK support and key rotation in production.
- Duplicate definitions in `schemas.py` (e.g., `PaymentBase` appears multiple times). Clean up to avoid confusion.
- `DBProperty.inventory` is defined both as a column (`JSON`) and as a relationship with the same attribute name; this is conflicting and should be reconciled.
 - Duplicate endpoint decorators have been resolved; routes for items are defined once per method/path.
- Some functions include unreachable or incorrect return statements (e.g., references to `property_obj` after earlier returns). Perform a pass to remove dead code and fix variable names.
- Uploads: returned URLs assume external hosting at `dashboard.nectarestates.com`; ensure static file serving is correctly configured or mount `StaticFiles`.
- WordPress category caching may become stale; add invalidation or TTL if categories change.

## Quickstart
- Create and activate a virtual environment, install deps:
  - `python -m venv .venv && .venv\\Scripts\\activate`
  - `pip install -r requirements.txt`
- Prepare `.env` with at least:
  - `DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/nectar`
  - `SECRET_KEY=your-secret`
  - `ALGORITHM=HS256`
  - `ACCESS_TOKEN_EXPIRE_MINUTES=60`
  - Optional WordPress:
    - `WP_USERNAME=...`
    - `WP_APP_PASSWORD=...`
- Initialize DB tables:
  - Start the app once (startup creates tables) or use Alembic.
- Run the server:
  - `uvicorn main:app --reload`
- Seed defaults (optional):
  - `python seed_defaults.py`

## Summary
The codebase delivers a full-featured property management backend with robust domain models, a pragmatic permission system, and an external WordPress sync pipeline. The highest-value improvements are dependency alignment (Pydantic), endpoint cleanup, and reconciliation of ORM model conflicts to ensure predictable behavior and easier maintenance.