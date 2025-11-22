# 🏠 Nectar Property Management Dashboard 2.0

A modern, multi-client-site property management platform with parent-child service architecture, built with React, FastAPI, and Docker.

## 🚀 Architecture Overview

This project implements a **multi-client-site architecture** with:
- **Parent Service**: Manages client sites and orchestrates child services
- **Child Services**: Individual property management services per client site
- **Frontend Applications**: Modern React interfaces for both parent and child dashboards

## 📁 Project Structure

```
ectarDashboard2.0/
├── parent/                          # Parent service (backend + frontend)
│   ├── main.py                     # Parent backend API (FastAPI)
│   ├── models.py                   # Database models
│   ├── frontend/                   # Parent dashboard (React + Vite)
│   │   ├── src/                    # React TypeScript source
│   │   ├── package.json            # Node.js dependencies
│   │   └── vite.config.ts          # Build configuration
│   ├── requirements.txt            # Python dependencies
│   └── Dockerfile                  # Container configuration
├── child/                           # Child service backend
│   ├── main.py                     # Child backend API (FastAPI)
│   ├── adapters/                   # WordPress integration adapters
│   │   ├── wordpress.py            # WordPress sync functionality
│   │   ├── base.py                 # Base adapter interface
│   │   └── registry.py             # Adapter registry
│   ├── alembic/                    # Database migrations
│   ├── requirements.txt            # Python dependencies
│   └── Dockerfile                  # Container configuration
├── frontend/                        # Main multi-client-site frontend
│   ├── src/                        # React TypeScript source
│   │   ├── api/                    # API service modules
│   │   ├── components/             # Reusable UI components
│   │   ├── pages/                  # Application pages
│   │   └── utils/                  # Utility functions
│   ├── package.json                # Node.js dependencies
│   └── vite.config.ts              # Build configuration
├── scripts/                         # Utility scripts
│   ├── create_demo_property.ps1    # Demo property creation
│   ├── mark_published.py           # Property publishing utility
│   └── seed_admin.py               # Admin user seeding
├── docker-compose.yml              # Complete service orchestration
├── nginx.conf                      # Reverse proxy configuration
├── build.sh                        # Build automation script
└── deploy.sh                       # Deployment automation script
```

## 🎯 Key Features

### Multi-Client Site Architecture
- **Client Site Management**: Create and manage multiple property management companies
- **Subdomain Routing**: Each client site gets their own subdomain (e.g., `client1.localhost`)
- **Isolated Data**: Client site-specific data isolation and security
- **Live Data Integration**: All API endpoints now use live database queries instead of mock data
- **Tenant Isolation**: Complete data separation between client sites using `client_site_id` filtering

### Property Management
- **Property Listings**: Create and manage property listings
- **Tenant Management**: Track tenants, leases, and occupancy
- **Maintenance Tracking**: Schedule and track maintenance requests
- **Financial Management**: Track rent, expenses, and financial reports

### Branding & Customization
- **Custom Branding**: Each client site can customize their dashboard appearance
- **Logo & Colors**: Upload custom logos and set brand colors
- **Domain Mapping**: Custom domain support for each client site

### Integration Capabilities
- **WordPress Sync**: Automatic synchronization with WordPress websites
- **API Integration**: RESTful APIs for third-party integrations
- **Webhook Support**: Real-time notifications and updates

## 🛠 Technology Stack

### Backend
- **FastAPI**: Modern, fast Python web framework
- **PostgreSQL**: Robust relational database
- **SQLAlchemy**: Python SQL toolkit and ORM
- **Alembic**: Database migration tool
- **JWT**: JSON Web Token authentication

### Frontend
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Type-safe JavaScript development
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Mantine**: React components library

### Infrastructure
- **Docker**: Containerization for all services
- **Docker Compose**: Multi-container orchestration
- **Nginx**: Reverse proxy and load balancing
- **PostgreSQL**: Database management

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Running with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/Verovian-Nector/nectarDashboard2.0.git
   cd nectarDashboard2.0
   ```

2. **Start all services**
   ```bash
   docker compose up -d
   ```

3. **Access the applications**
   - **Parent Dashboard**: http://localhost:5174
   - **Child Frontend**: http://localhost:5173/?subdomain=child
   - **Parent API**: http://localhost:8001
   - **Child API**: http://localhost:8002

### Local Development

1. **Install dependencies**
   ```bash
   # Backend dependencies
   cd parent && pip install -r requirements.txt
   cd ../child && pip install -r requirements.txt
   
   # Frontend dependencies
   cd ../frontend && npm install
   cd ../parent/frontend && npm install
   ```

2. **Start services individually**
   ```bash
   # Start parent backend
   cd parent && python main.py
   
   # Start child backend
   cd child && python main.py
   
   # Start frontends
   cd frontend && npm run dev
   cd parent/frontend && npm run dev
   ```

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:
- Database connection strings
- JWT secret keys
- API endpoints
- WordPress integration settings

### Database Setup
```bash
# Run migrations
docker compose exec parent alembic upgrade head
```

## 🔑 Authentication

### Default Credentials
- **Username**: `admin`
- **Password**: `NectarDev123!`

### API Authentication
All API endpoints require JWT tokens. Obtain tokens from `/auth/login` endpoints.

## 📊 API Endpoints

### Parent Service (Port 8001)
- `GET /client-sites` - List all client sites
- `POST /client-sites` - Create new client site
- `GET /client-sites/{id}` - Get client site details
- `GET /config` - System configuration

### Child Service (Port 8002)
- `GET /properties` - List properties (tenant-isolated)
- `POST /auth/login` - User authentication with subdomain support
- `GET /dashboard/stats` - Dashboard statistics (live data)
- `GET /branding` - Tenant branding
- `GET /financials` - Financial data (tenant-isolated)

## 🧪 Testing

### Backend Tests
```bash
cd parent && pytest
cd child && pytest
```

### Frontend Tests
```bash
cd frontend && npm test
cd parent/frontend && npm test
```

### Tenant Isolation Testing
```bash
# Test glam client site
curl -X POST "http://localhost:8002/auth/login" -H "Host: glam.localhost" -d '{"email":"admin@glam.localhost","password":"glam123"}'

# Test dox client site  
curl -X POST "http://localhost:8002/auth/login" -H "Host: dox.localhost" -d '{"email":"admin@dox.localhost","password":"dox123"}'
```

## 🚀 Deployment

### Production Deployment
See `DEPLOYMENT.md` for production deployment instructions.

### Docker Deployment
```bash
# Build and deploy
docker compose -f docker-compose.yml up -d --build
```

## 📚 Documentation

- **API Documentation**: Available at `/docs` endpoints
- **Frontend Components**: See component documentation
- **Database Schema**: See models in respective services

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

This project is proprietary software developed for Verovian Nectar.

## 📞 Support

For support and questions, please contact the development team.

---

**Built by the virtu team**