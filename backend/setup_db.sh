#!/bin/bash

# School Management System - PostgreSQL Setup Script

echo "🚀 Setting up PostgreSQL Database for School Management System"
echo "=============================================================="

# Step 1: Install required Python packages
echo ""
echo "📦 Installing required Python packages..."
pip install psycopg2-binary asyncpg python-dotenv sqlalchemy alembic

# Step 2: Check if PostgreSQL is running (Docker)
echo ""
echo "🐘 Checking PostgreSQL..."

# Try to connect to existing PostgreSQL
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not found. Please ensure PostgreSQL is installed and running."
    echo "Connection string from .env: $(grep DATABASE_URL .env)"
else
    # Check if PostgreSQL container exists
    if ! docker ps | grep -q school_db; then
        echo "Creating PostgreSQL container..."
        docker run --name school_db \
            -e POSTGRES_PASSWORD=password \
            -e POSTGRES_DB=school_db \
            -p 5432:5432 \
            -d postgres:15
        
        echo "⏳ Waiting for PostgreSQL to start..."
        sleep 5
    else
        echo "✅ PostgreSQL container is already running"
    fi
fi

# Step 3: Run Alembic migrations
echo ""
echo "🔄 Running database migrations..."
alembic upgrade head

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully!"
else
    echo "❌ Migration failed. Check the error above."
    exit 1
fi

# Step 4: Seed the database (if seed.py exists)
echo ""
echo "🌱 Seeding database with initial data..."
if [ -f "seed.py" ]; then
    python seed.py
    echo "✅ Database seeded!"
else
    echo "⚠️  seed.py not found. Skipping seeding."
fi

echo ""
echo "=============================================================="
echo "✅ Setup complete! Your database is ready."
echo ""
echo "To start the server, run:"
echo "  uvicorn main:app --reload"
echo "=============================================================="
