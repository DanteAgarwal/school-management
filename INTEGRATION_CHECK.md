# Backend & Frontend Integration Status ✅

## Connection Configuration

### Frontend
- **API Base URL**: `http://localhost:8000`
- **Token Storage**: localStorage (token & user)
- **Auth Header**: `Bearer {token}`
- **Error Handling**: Automatic logout on 401

### Backend
- **Port**: 8000
- **CORS**: Enabled for all origins (`["*"]`)
- **Auth**: JWT with argon2 password hashing
- **Database**: SQLite (school_management.db)

## API Endpoints Connected

### Authentication
```
POST /api/auth/login
  Input: { email, password }
  Output: { access_token, token_type, user }
```

### Dashboard
```
GET /api/dashboard/{role}
  Roles: admin, teacher, student, parent
  Output: { stats, recentActivity, notifications }
```

### Students
```
GET /api/students
  Output: { students: [...] }

POST /api/students
  Input: StudentCreate schema
  Output: StudentResponse
```

### Homework
```
GET /api/homework
  Output: { homework: [...] }

POST /api/homework
  Input: HomeworkCreate schema
  Output: HomeworkResponse
  Auth: Teachers only
```

### Attendance
```
POST /api/attendance
  Input: AttendanceCreate schema
  Output: { status, message }
  Auth: Teachers only
```

### User Profile
```
GET /api/users/me
  Output: UserResponse
  Auth: Required
```

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@school.com | admin123 |
| Teacher | teacher@school.com | teacher123 |
| Student | student@school.com | student123 |
| Parent | parent@school.com | parent123 |

## How to Run

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# Server runs on http://localhost:8000
```

### Frontend
```bash
cd school_frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

## Known Features
- ✅ JWT Authentication
- ✅ Role-based access control (Admin, Teacher, Student, Parent)
- ✅ Student management
- ✅ Homework assignment and tracking
- ✅ Attendance marking
- ✅ Dashboard with role-specific stats
- ✅ Notifications
- ✅ WebSocket support for real-time updates

## Fallback Behavior
If backend is unavailable, frontend uses mock data from getMockData() function to allow testing without a running server.
