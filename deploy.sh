#!/bin/bash
# Production deployment script for Lightsail

echo "🚀 Starting production deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please update .env file with your production values"
    exit 1
fi

# Create frontend .env if it doesn't exist
if [ ! -f frontend/.env ]; then
    echo "⚠️  frontend/.env file not found. Creating..."
    echo "VITE_API_URL=/api" > frontend/.env
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# Build the containers
echo "🏗️  Building Docker containers..."
docker compose build --no-cache

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    
    # Start the containers
    echo "🚀 Starting containers..."
    docker compose up -d
    
    echo ""
    echo "✅ Deployment completed!"
    echo "📊 To view logs: docker compose logs -f"
    echo "🛑 To stop: docker compose down"
    echo ""
    echo "🌐 Application should be available at: http://localhost"
else
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi