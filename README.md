# NECTAR Property Management API

## Project Structure
The following shows the current directory tree of the project root.

```text
// Directory tree (3 levels, limited to 200 entries)
├── .env.example
├── .github\
│   └── workflows\
│       └── tests.yml
├── .gitignore
├── .pytest.out
├── .pytest_cache\
├── .python-version
├── .trae\
│   └── rules\
│       └── project_rules.md
├── FRONTEND_HANDOFF.md
├── INTEGRATIONS.md
├── LOCAL_DEV.md
├── README.md
├── TASKS.md
├── adapters\
│   ├── __init__.py
│   ├── base.py
│   ├── registry.py
│   └── wordpress.py
├── alembic.ini
├── alembic\
│   ├── README
│   ├── env.py
│   └── script.py.mako
├── assets\
│   ├── favicon.png
│   └── logo_dark_mode.png
├── auth.py
├── config.py
├── crud.py
├── database.py
├── dependencies.py
├── dev.db
├── docker-compose.yml
├── duedate.PNG
├── feilds.txt
├── frontend\
│   ├── .gitignore
│   ├── assets\
│   │   ├── favicon.png
│   │   └── logo_dark_mode.png
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── public\
│   │   ├── logo.png
│   │   └── vite.svg
│   ├── src\
│   │   ├── api\
│   │   ├── components\
│   │   ├── config\
│   │   ├── config.ts
│   │   ├── context\
│   │   ├── counter.ts
│   │   ├── layouts\
│   │   ├── main.tsx
│   │   ├── pages\
│   │   ├── state\
│   │   ├── style.css
│   │   ├── typescript.svg
│   │   └── utils\
│   └── tsconfig.json
├── log.txt
├── main.py
├── main.py.md
├── nano reset_password.py
├── prop01.PNG
├── prop03.PNG
├── pyproject.toml
├── pytest.ini
├── requirements.txt
├── schemas.py
├── screen\
│   ├── 01-dashboard.png
│   ├── 02-calendar_month.png
│   ├── 03-calendar_week.png
│   ├── 04-financials.png
│   ├── 05-repairs_maintenance_tabs.png
│   ├── 06-repairs_maintenance_table.png
│   ├── 07-properties_grid.png
│   ├── 07-properties_table.png
│   ├── 08-properties_tenantDetails.png
│   ├── 09-properties_financials.png
│   ├── 10-properties_inventory.png
│   ├── 11-properties_documents.png
│   ├── 12-properties_maintenance.png
│   ├── 13-properties_inspection.png
│   ├── 14-settings_customization.png
│   ├── 15-settings_location.png
│   ├── 16-tenantsList.png
│   ├── 17-tenantsGroup.png
│   ├── 18-settings_integration.png
│   ├── step-1.png
│   ├── step-2.png
│   └── step-3.png
├── scripts\
│   ├── create_demo_property.ps1
│   ├── mark_published.py
│   ├── ping_db_asyncpg.py
│   ├── seed_admin.py
│   └── test_defaults_seeding.py
├── security.py
├── seed_defaults.py
├── summary.md
├── sync_test.py
├── sync_to_wordpress.py
├── test.db
├── test.jpg
├── test_db_42395e5f46da41de8e909d13f51a76eb.db
├── test_db_60e17baa76c944acb0990e630b6bd823.db
├── test_db_635d4035fa9b43d996fac259d53ad1b2.db
├── test_db_81a3c20c2d4a48cdb86295e5906c7b56.db
├── test_db_8e5cf4c0c44044ba885c37437cc8cb18.db
├── test_db_8f3142edbfcd4dddbb6064e85283f39b.db
├── test_db_9299d5159ec94131bc6c5d1f1a6b4947.db
├── test_db_ae65a82e9632486eb45d4c96037b40e4.db
├── test_db_c10ffa49a25748a2989dcba43819ad55.db
├── test_db_c604162b71c24c92ba2e7e9f11f62f40.db
├── test_db_e1a48671cc36412db08efb63dd019864.db
├── test_db_ffde9d70f80745e199ff07664569e747.db
├── tests\
│   ├── conftest.py
│   ├── test_acf_persistence.py
│   ├── test_adapter_registry.py
│   ├── test_dlq.py
│   ├── test_inbound_import.py
│   ├── test_properties_api.py
│   ├── test_public_feed.py
│   ├── test_upload_endpoint.py
│   ├── test_webhook_ingest.py
│   └── test_wordpress_adapter.py
├── uploads\
│   ├── 0569ba4084674c4da450ae9c1e2d6879.png
│   ├── 08814542bf5e413aa6154146eadfa04a.txt
│   ├── 11f248ebd7c24e94895d68497da3ddea.txt
│   ├── 1250fdecc24549c38760ed476c4d5649.bin
│   ├── 15c13db283754d7e87a12e868c00cb05.txt
│   ├── 15df4441613b475ba46208be94d6ef2b.bin
│   ├── 187cdb7a952d4b15a873050accff8fab.txt
│   ├── 1aabaa94d5e44981bf419766b013409b.bin
│   ├── 1dd1660cb29c4f1195b37a0f23c48452.bin
│   ├── 2b423dd8429b42db95b4e9461fb0acf9.bin
│   ├── 2b823f7caf5944f391368ee9a7feb45d.bin
│   ├── 2e5200b7ef2c4946aceb8296ffeead9e.bin
│   ├── 3070a7da3d1044c0b5a8e8fce46e7461.bin
│   ├── 33b8ffb41e4e4286a0b20bf654134f42.txt
│   ├── 39b0a811db944d4dbd1941a654c5a0b8.txt
│   ├── 3d543dd061f24ca1836d7afc6d7e994c.bin
│   ├── 48d8317ccac5477293b9ca5d46d3c447.txt
│   ├── 4be58a7321424013baf936607734a3fc.bin
│   ├── 4cf01bd6c5ef45338b0d724ec9bc41fc.bin
│   ├── 50359adf376b44c4bf78f6bc652a6b45.bin
│   ├── 5b52faaad2d844ffb3954ef21d9603db.bin
│   ├── 5b9f8ed28ae7474cba861cf776915134.txt
│   ├── 639201e91bd744b98d994c142bee009e.bin
│   ├── 699860c70ac543109e990b1176658544.txt
│   ├── 6a16fd8373f44fef8f23381575ad8422.bin
│   ├── 6c185098df0646ec837b0fd55c77e756.png
│   ├── 71f9d03573e54ee7a47c9e249ae276c4.txt
│   ├── 7729eea044a446c59050d443077c7c0c.txt
│   ├── 7bb90d27571d48c48e1e7c7333cd8a54.txt
│   ├── 7e3fa5b2e3da4f2685bc19bbbafb3b3e.txt
│   ├── 7f98b56aba914d9083dac2dad3c0e3a0.txt
│   ├── 8509d62fec724a6db312e5c770d972b3.bin
│   ├── 916f5823ce7143c8b25050db9361a4db.txt
│   ├── 9c2254c3702544ffa604731d8e3fdd17.bin
│   ├── 9c37824822ce4b7cb609f207b1ac80d7.txt
│   ├── a129ecda1443468ea7c322f5aec129b6.txt
│   ├── ab5e688a84ca41d395a855ad84b4b067.txt
│   ├── af9374f5325d4259af9a8a2ffaa7175c.txt
│   ├── b1997daa7fcd454ba5e0043d285aca74.txt
│   ├── b213d838fa3141efa914f6ff1cd207be.bin
│   ├── b60518621a284162bfaf2572ca71f8e9.bin
│   ├── b9ec70824f7040d1af8b6a91dd4602c8.txt
│   ├── c025bbd132ba4318875b14b48aeaa229.bin
│   ├── c02e6619133943ec88de03fd6780f73e.txt
│   ├── c168069cc5df414b80bc56138eea83cf.txt
│   ├── c17a4738c4c44228a1fd554cd9d27808.bin
│   ├── c6113878cc124c57a969dd039f922987.txt
│   ├── c818650ab8d849a8acf087269b266b96.txt
│   ├── c85e4388635c4c578f14d9855cf387bb.bin
│   ├── ca9d33aa6425443496593c973970dead.txt
│   ├── d91ae3a404f74974810c03ba8492c69a.png
│   ├── d9f8aab8b4054b48ae55d63dde6ef4de.bin
│   ├── ddda77e8586f443baf5e828535d8b854.txt
│   ├── dee6b091fe114b128577600431d6d0b8.bin
│   ├── f6554714fde146dca8e55e094f30397c.bin
│   ├── f723f3ed8a6749a38092af9543b744a4.bin
│   ├── f726aefe02f54cbea1bcc4eac19417f9.txt
│   ├── f84efb7c25b847c49816dc57493c6f3d.txt
│   └── f98b270a28064f899f0a24026dffda60.txt
├── uv.lock
└── wordpress_sync.log
```

A secure, FastAPI-based backend for managing property data, users, and inspections — built to integrate with FlutterFlow and sync with WordPress credentials.

---

## 🚀 Overview

NECTAR is a modern, async Python backend that powers a real estate/property management dashboard app. It provides:
- JWT-based authentication
- Role-based access control
- Full CRUD for properties and users
- Nested JSON fields for tenant/property information, financial, and inspection data
- Seamless integration with FlutterFlow
- Compatibility with WordPress user accounts

Built with:
- FastAPI – High-performance web framework
- SQLAlchemy (Async) – ORM for PostgreSQL/SQLite
- PostgreSQL – Robust relational database
- Pydantic v2 – Data validation
- Authlib + OAuth2 – JWT handling and secure authentication

---

## 📦 Features

✅ User Management
- Login with WordPress credentials (after migration)
- Roles: `propertyadmin`, `propertymanager`, `blog`
- Password reset flow

✅ Property Management
- Create, read, update, delete properties
- Store tenant, financial, maintenance, and inspection data as JSON
- Owner assignment and access control

✅ API Endpoints
- `POST /token` – Get JWT token
- `POST /users` – Create user
- `GET /properties` – List all properties
- `POST /properties` – Create property (seeds inventory)
- `GET /properties/{id}` – Get property details
- `PUT /properties/{id}` – Update property

---

## 🛠️ Setup & Installation

### 1) Clone the Project
```bash
git clone https://your-repo-url/nectarapp.git
cd nectarapp
```

### 2) Configure Environment
- Copy `.env.example` to `.env` and adjust values as needed.
- Default local Postgres URL uses port `5433`:
  - `DATABASE_URL=postgresql+asyncpg://nectar:nectar@127.0.0.1:5433/nectar`
- For quick local development, you may point to SQLite:
  - `DATABASE_URL=sqlite+aiosqlite:///./dev.db`
- Set `SECRET_KEY` in `.env` (any non-empty string for dev).
 - Optionally set JWT config:
   - `ALGORITHM=HS256`
   - `ACCESS_TOKEN_EXPIRE_MINUTES=30`

### 3) Install Dependencies
```bash
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell
pip install -r requirements.txt
```

### 4) Initialize Database
- If using Postgres, ensure the database is running and accessible.
- Quickly verify connectivity:
```bash
python scripts/ping_db_asyncpg.py
```

### 5) Seed Defaults (Rooms and Items)
- Seed core defaults used during property creation:
```bash
python seed_defaults.py
```
- Seeded content:
  - Default rooms: `Bedroom`, `Bathroom`, `Kitchen`
  - Default items:
    - `Bedroom`: `Bed`, `Pillow`
    - `Bathroom`: `Sink`
    - `Kitchen`: `Oven`

### 6) Run the API Server
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
Optional: set a `BASE_URL` env var to customize returned file URLs from `/upload` (defaults to the request base URL).

---

## ✅ Defaults-Based Seeding Behavior
- Property creation automatically creates an `Inventory` and rooms using `acf.profilegroup` counts:
  - `beds` → `Bedroom N`
  - `bathrooms` → `Bathroom N`
  - `living_rooms` → `Living Room N`
  - `parking` → `Parking Space N`
- For each created room, default items are pulled from the `default_items` table by `room_name`:
  - Example: `Bedroom` gets `Bed` and `Pillow`; `Bathroom` gets `Sink`.
- If a room type has no defaults, the room is created with zero items.

---

## 🔎 Quick Smoke Tests
- Create a demo property via script (Windows PowerShell):
```powershell
powershell -NoProfile -File scripts/create_demo_property.ps1 -PropertyTitle "Demo Property (Script)" -Beds 2 -Bathrooms 1 -LivingRooms 1 -Parking 0
```
- Verify defaults-based seeding without the API server:
```bash
python scripts/test_defaults_seeding.py
```

---

## 📌 Notes
- The API server uses the `DATABASE_URL` from `.env`. If you seed defaults in Postgres but the API points to SQLite, default items will not appear until the server is configured to use Postgres.
- WordPress sync hooks can be enabled via integration configs; for local dev, `WP_SYNC_ENABLED=false` is fine.
- Public feed and webhook ingestion are documented in `INTEGRATIONS.md`.
- Useful dev scripts:
  - `scripts/seed_admin.py` – Creates or updates a local admin user
  - `scripts/ping_db_asyncpg.py` – Validates Postgres connectivity
  - `scripts/create_demo_property.ps1` – End-to-end demo property creation
  - `scripts/test_defaults_seeding.py` – Direct test of defaults seeding