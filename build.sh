#!/bin/bash
# Production build script for Lightsail deployment

echo "🚀 Starting production build..."

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
fi

# Create frontend .env if it doesn't exist
if [ ! -f frontend/.env ]; then
    echo "⚠️  frontend/.env file not found. Creating from .env.example..."
    cp frontend/.env.example frontend/.env 2>/dev/null || echo "VITE_API_URL=http://localhost:8000/api" > frontend/.env
fi

# Build the containers
echo "🏗️  Building Docker containers..."
docker compose build --no-cache

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo ""
    echo "🚀 To start the production environment:"
    echo "   docker compose up -d"
    echo ""
    echo "📊 To view logs:"
    echo "   docker compose logs -f"
    echo ""
    echo "🛑 To stop:"
    echo "   docker compose down"
else
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi