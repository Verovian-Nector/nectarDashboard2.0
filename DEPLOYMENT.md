# Production Deployment Files

This directory now contains all the production deployment files for Lightsail single-instance deployment.

## Files Created:

1. **docker-compose.yml** - Production Docker Compose configuration
   - PostgreSQL database with health checks
   - Backend API service
   - Frontend nginx service
   - Nginx reverse proxy
   - Internal networking for security

2. **nginx.conf** - Nginx reverse proxy configuration
   - Routes /api/* to backend service
   - Routes all other traffic to frontend service
   - Ready for SSL certificate addition

3. **Dockerfile** (root) - Backend container
   - Python 3.11 slim base
   - UV package manager for fast installs
   - Exposes port 8000

4. **frontend/Dockerfile** - Frontend container
   - Multi-stage build (Node → Nginx)
   - Production build optimization
   - SPA routing support

5. **.dockerignore** - Optimized build context
   - Excludes unnecessary files
   - Keeps build context small

6. **deploy.sh** - Production deployment script
   - Automated deployment process
   - Environment setup
   - Health checks and validation

7. **build.sh** - Build-only script
   - For testing builds without deployment

## Deployment Instructions:

1. **Setup Environment:**
   ```bash
   # Copy and configure environment files
   cp .env.example .env
   # Edit .env with your production values
   ```

2. **Deploy:**
   ```bash
   # Run deployment script
   ./deploy.sh
   ```

3. **SSL Setup (after deployment):**
   - Get SSL certificate from Lightsail console
   - Download certificate bundle
   - Copy to `/opt/ssl` on server
   - Update nginx.conf with SSL configuration

## Production Features:

- ✅ Internal networking (no direct backend exposure)
- ✅ Health checks for database
- ✅ Graceful service dependencies
- ✅ Zero-downtime deployment ready
- ✅ Optimized Docker images
- ✅ SPA routing support
- ✅ API proxy configuration

The application is now ready for production deployment on AWS Lightsail!