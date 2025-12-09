# PostgreSQL Setup Guide - School Management System

## Quick Start (Automatic)

```bash
cd backend
chmod +x setup_db.sh
./setup_db.sh
```

---

## Manual Setup (Step by Step)

### 1️⃣ Install PostgreSQL

**Option A: Using Docker (Recommended)**
```bash
docker run --name school_db \
    -e POSTGRES_PASSWORD=password \
    -e POSTGRES_DB=school_db \
    -p 5432:5432 \
    -d postgres:15

# Verify it's running
docker ps | grep school_db
```

**Option B: Native Installation (Ubuntu/Linux)**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql

# Access PostgreSQL
sudo -u postgres psql
```

### 2️⃣ Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
# Or manually:
pip install fastapi uvicorn sqlalchemy psycopg2-binary asyncpg python-dotenv alembic email-validator pydantic-settings
```

### 3️⃣ Verify Database Configuration

Check your `.env` file:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/school_db
```

If using Docker with different credentials, update `.env` accordingly.

### 4️⃣ Create Database Tables

**Option A: Using Alembic (Recommended)**
```bash
cd backend
alembic upgrade head
```

**Option B: Manual Creation**
```bash
cd backend
python -c "from database import engine; from models import *; Base.metadata.create_all(bind=engine)"
```

### 5️⃣ Seed Initial Data

```bash
cd backend
python seed.py
```

### 6️⃣ Start the Server

```bash
cd backend
uvicorn main:app --reload
```

The API will be available at: **http://localhost:8000**

Swagger docs: **http://localhost:8000/docs**

---

## 🐛 Common Issues & Solutions

### Issue: `ModuleNotFoundError: No module named 'email_validator'`
**Solution:**
```bash
pip install email-validator
```

### Issue: `sqlalchemy.exc.NoSuchModuleError: Can't load plugin: sqlalchemy.dialects:driver`
**Solution:**
```bash
pip install psycopg2-binary asyncpg
```

### Issue: `Connection refused` when connecting to database
**Check if PostgreSQL is running:**
```bash
# Docker
docker ps | grep school_db

# Or test connection
psql -U postgres -d school_db -c "SELECT 1"
```

### Issue: `FATAL: role "postgres" does not exist`
**Create the role:**
```bash
# Using Docker
docker exec school_db psql -U postgres -c "CREATE USER postgres WITH PASSWORD 'password';"
docker exec school_db psql -U postgres -c "ALTER ROLE postgres SUPERUSER;"

# Or native PostgreSQL
sudo -u postgres createuser postgres
sudo -u postgres psql -c "ALTER ROLE postgres WITH PASSWORD 'password';"
```

### Issue: Alembic migration fails
**Check target_metadata in alembic/env.py:**
```bash
# Make sure models are imported
python -c "from models import *; print('Models imported successfully')"
```

---

## 📊 Database Schema

Your models are located in `models/`:
- `user.py` - User accounts and roles
- `student.py` - Student information
- `announcement.py` - School announcements
- `attendance.py` - Attendance tracking
- `exam.py` - Exam information
- `fee.py` - Fee management
- `homework.py` - Homework assignments

All tables will be created automatically via Alembic migrations.

---

## 🔄 Database Operations

### Reset Database
```bash
# Drop all tables (CAUTION!)
alembic downgrade base

# Recreate fresh
alembic upgrade head
python seed.py
```

### Create a New Migration
```bash
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

### Check Database Connection
```bash
psql -U postgres -d school_db -c "SELECT version();"
```

---

## 📝 Project Structure
```
backend/
├── main.py              # FastAPI app
├── config.py            # Configuration
├── database.py          # Database setup
├── models/              # SQLAlchemy models
├── schemas/             # Pydantic schemas
├── api/                 # API endpoints
├── alembic/             # Database migrations
└── .env                 # Environment variables
```

---

## 🎯 Next Steps

1. Start the backend: `uvicorn main:app --reload`
2. Visit http://localhost:8000/docs for API documentation
3. Set up the frontend in `school_frontend/`
4. Configure environment variables as needed

---

**Questions?** Check the error messages above and follow the solutions provided.
