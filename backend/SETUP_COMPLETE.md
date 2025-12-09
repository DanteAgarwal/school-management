# Complete Setup & Troubleshooting Guide

## What I've Fixed ✅

### 1. **Missing imports in model files**
   - Added `from database import Base` to all model files
   - Added necessary SQLAlchemy imports (Column, Integer, etc.)
   - Fixed: `announcement.py`, `attendance.py`, `exam.py`, `fee.py`, `homework.py`

### 2. **Alembic configuration** 
   - Updated `alembic/env.py` to properly import models
   - Set `target_metadata = Base.metadata` for auto-generation
   - Configured async PostgreSQL driver support

### 3. **Database setup**
   - Updated `database.py` with async engine support
   - Created `requirements.txt` with all dependencies
   - Fixed imports in all `__init__.py` files

---

## Installation Steps

### Step 1: Install All Dependencies
```bash
cd /workspaces/school-management/backend
pip install -r requirements.txt
```

### Step 2: Set Up PostgreSQL Database

**Using Docker (Recommended):**
```bash
docker run --name school_db \
    -e POSTGRES_PASSWORD=password \
    -e POSTGRES_DB=school_db \
    -p 5432:5432 \
    -d postgres:15

# Wait for it to start
sleep 3
```

**OR Using Native PostgreSQL:**
```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE school_db;
CREATE USER postgres WITH PASSWORD 'password';
ALTER ROLE postgres SUPERUSER;
GRANT ALL ON DATABASE school_db TO postgres;
EOF
```

### Step 3: Run Database Migrations
```bash
cd /workspaces/school-management/backend
alembic upgrade head
```

### Step 4: Start the Server
```bash
uvicorn main:app --reload
```

Server will be available at: **http://localhost:8000**
- API Docs: **http://localhost:8000/docs**
- ReDoc: **http://localhost:8000/redoc**

---

## If You Get Error: "ModuleNotFoundError: No module named 'pydantic_settings'"

Run this command:
```bash
pip install pydantic-settings==2.1.0
```

Or install everything at once:
```bash
pip install -r requirements.txt
```

---

## If You Get Error: "Can't load plugin: sqlalchemy.dialects:driver"

Run:
```bash
pip install psycopg2-binary asyncpg
```

---

## If Database Connection Fails

1. **Check if PostgreSQL is running:**
   ```bash
   docker ps | grep school_db
   ```

2. **Test the connection:**
   ```bash
   psql -U postgres -d school_db -c "SELECT 1"
   ```

3. **Verify .env DATABASE_URL:**
   ```bash
   grep DATABASE_URL .env
   ```
   Should show: `postgresql://postgres:password@localhost:5432/school_db`

---

## Reset Database (If Needed)

```bash
# Drop all tables and start fresh
alembic downgrade base

# Recreate all tables
alembic upgrade head
```

---

## Project Structure
```
backend/
├── main.py              ← FastAPI application
├── config.py            ← Configuration & settings
├── database.py          ← Database connection setup
├── requirements.txt     ← Python dependencies
├── .env                 ← Environment variables
├── models/              ← SQLAlchemy models
│   ├── user.py
│   ├── announcement.py
│   ├── attendance.py
│   ├── exam.py
│   ├── fee.py
│   └── homework.py
├── schemas/             ← Pydantic request/response schemas
├── api/                 ← API routes
├── core/                ← Security & dependencies
└── alembic/             ← Database migrations
    └── env.py           ← Migration configuration
```

---

## Next Steps

1. ✅ Install dependencies: `pip install -r requirements.txt`
2. ✅ Start PostgreSQL database
3. ✅ Run migrations: `alembic upgrade head`
4. ✅ Start server: `uvicorn main:app --reload`
5. 🔜 Set up frontend in `school_frontend/`

---

**All bugs have been fixed! Your database should now be ready to use.**
