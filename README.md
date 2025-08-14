# NECTAR Property Management API

A secure, FastAPI-based backend for managing property data, users, and inspections — built to integrate with FlutterFlow and sync with WordPress credentials.

---

## 🚀 Overview

NECTAR is a modern, async Python backend that powers a real estate/property management mobile app. It provides:
- JWT-based authentication
- Role-based access control
- Full CRUD for properties and users
- Nested JSON fields for tenant, financial, and inspection data
- Seamless integration with **FlutterFlow**
- Compatibility with **WordPress user accounts**

Built with:
- **FastAPI** – High-performance web framework
- **SQLAlchemy (Async)** – ORM for PostgreSQL
- **PostgreSQL** – Robust relational database
- **Pydantic v2** – Data validation
- **JWT + OAuth2** – Secure authentication
- **ngrok / Render** – Dev & production hosting

---

## 📦 Features

✅ **User Management**
- Login with WordPress credentials (after migration)
- Role-based: `propertyadmin`, `propertymanager`, `editor`
- Password reset flow

✅ **Property Management**
- Create, read, update, delete properties
- Store tenant, financial, maintenance, and inspection data as JSON
- Owner assignment and access control

✅ **API Endpoints**
- `POST /token` – Get JWT token
- `POST /users` – Create user
- `GET /properties` – List all properties
- `PUT /properties/{id}/inspection` – Add inspection record

✅ **FlutterFlow Ready**
- Clean JSON responses
- CORS enabled
- Form and JSON support
- JWT header authentication

---

## 🔧 Tech Stack

| Layer | Technology |
|------|------------|
| Backend | FastAPI (Python 3.11+) |
| Database | PostgreSQL (via `asyncpg`) |
| ORM | SQLAlchemy 2.0+ (Async) |
| Auth | JWT, OAuth2PasswordRequestForm |
| Hashing | `passlib` + `bcrypt` |
| Validation | Pydantic v2 + `pydantic-settings` |
| Deployment | ngrok (dev), Render/Railway (prod) |
| Frontend | FlutterFlow (mobile) |

---

## 🛠️ Setup & Installation

### 1. Clone the Project
```bash
git clone https://your-repo-url/nectarapp.git
cd nectarapp
