# main.py - FastAPI School Management System Backend
"""
Complete FastAPI backend with JWT auth, WebSockets, and SQLite
Run with: uvicorn main:app --reload
"""

from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Date, Text, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker, relationship
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr
import enum
import json
import asyncio
from fastapi.middleware.cors import CORSMiddleware

# =====================
# DATABASE SETUP
# =====================

DATABASE_URL = "sqlite:///./school_management.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# =====================
# ENUMS
# =====================

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"
    PARENT = "parent"
    ACCOUNTANT = "accountant"

class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    HALF_DAY = "half_day"

class HomeworkStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    GRADED = "graded"

class FeeStatus(str, enum.Enum):
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    PENDING = "pending"

# =====================
# DATABASE MODELS
# =====================

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String)
    password_hash = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    student_profile = relationship("Student", back_populates="user", uselist=False)
    parent_profile = relationship("Parent", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user")

class AcademicYear(Base):
    __tablename__ = "academic_years"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=False)

class Class(Base):
    __tablename__ = "classes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    
    sections = relationship("Section", back_populates="class_obj")
    subjects = relationship("Subject", back_populates="class_obj")

class Section(Base):
    __tablename__ = "sections"
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    name = Column(String, nullable=False)
    
    class_obj = relationship("Class", back_populates="sections")
    students = relationship("Student", back_populates="section")

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    
    class_obj = relationship("Class", back_populates="subjects")

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    admission_no = Column(String, unique=True, nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"))
    section_id = Column(Integer, ForeignKey("sections.id"))
    roll_no = Column(Integer)
    dob = Column(Date)
    gender = Column(String)
    address = Column(Text)
    
    user = relationship("User", back_populates="student_profile")
    section = relationship("Section", back_populates="students")
    attendance_records = relationship("AttendanceRecord", back_populates="student")
    homework_submissions = relationship("HomeworkSubmission", back_populates="student")
    marks = relationship("Mark", back_populates="student")
    parents = relationship("StudentParent", back_populates="student")

class Parent(Base):
    __tablename__ = "parents"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    relation_type = Column(String)
    
    user = relationship("User", back_populates="parent_profile")
    children = relationship("StudentParent", back_populates="parent")

class StudentParent(Base):
    __tablename__ = "student_parents"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("parents.id"), nullable=False)
    
    student = relationship("Student", back_populates="parents")
    parent = relationship("Parent", back_populates="children")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(SQLEnum(AttendanceStatus), nullable=False)
    remarks = Column(Text)
    taken_by_teacher_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    student = relationship("Student", back_populates="attendance_records")

class Syllabus(Base):
    __tablename__ = "syllabus"
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    file_url = Column(String)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

class Homework(Base):
    __tablename__ = "homework"
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    due_date = Column(Date, nullable=False)
    attachment_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    submissions = relationship("HomeworkSubmission", back_populates="homework")

class HomeworkSubmission(Base):
    __tablename__ = "homework_submissions"
    id = Column(Integer, primary_key=True, index=True)
    homework_id = Column(Integer, ForeignKey("homework.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    file_url = Column(String)
    text_answer = Column(Text)
    marks = Column(Float)
    feedback = Column(Text)
    status = Column(SQLEnum(HomeworkStatus), default=HomeworkStatus.SUBMITTED)
    
    homework = relationship("Homework", back_populates="submissions")
    student = relationship("Student", back_populates="homework_submissions")

class Exam(Base):
    __tablename__ = "exams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    start_date = Column(Date)
    end_date = Column(Date)

class Mark(Base):
    __tablename__ = "marks"
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    marks_obtained = Column(Float, nullable=False)
    max_marks = Column(Float, nullable=False)
    grade = Column(String)
    
    student = relationship("Student", back_populates="marks")

class FeeHead(Base):
    __tablename__ = "fee_heads"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)

class StudentFee(Base):
    __tablename__ = "student_fees"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    fee_head_id = Column(Integer, ForeignKey("fee_heads.id"), nullable=False)
    amount_due = Column(Float, nullable=False)
    amount_paid = Column(Float, default=0.0)
    due_date = Column(Date)
    status = Column(SQLEnum(FeeStatus), default=FeeStatus.PENDING)

class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    target_type = Column(String)
    target_id = Column(Integer)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String)
    reference_id = Column(Integer)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="notifications")

# Create all tables
Base.metadata.create_all(bind=engine)

# =====================
# PYDANTIC SCHEMAS
# =====================

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: UserRole

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    status: str
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class StudentCreate(BaseModel):
    user_id: int
    admission_no: str
    class_id: int
    section_id: int
    roll_no: int
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None

class StudentResponse(BaseModel):
    id: int
    admission_no: str
    roll_no: int
    user: UserResponse
    
    class Config:
        from_attributes = True

class HomeworkCreate(BaseModel):
    class_id: int
    section_id: Optional[int] = None
    subject_id: int
    title: str
    description: str
    due_date: date
    attachment_url: Optional[str] = None

class HomeworkResponse(BaseModel):
    id: int
    title: str
    description: str
    due_date: date
    subject_id: int
    
    class Config:
        from_attributes = True

class AttendanceCreate(BaseModel):
    student_id: int
    date: date
    status: AttendanceStatus
    remarks: Optional[str] = None

class DashboardStats(BaseModel):
    totalStudents: Optional[int] = 0
    totalTeachers: Optional[int] = 0
    totalClasses: Optional[int] = 0
    attendanceToday: Optional[float] = 0.0

class LoginRequest(BaseModel):
    email: str
    password: str

# =====================
# SECURITY
# =====================

SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# =====================
# FASTAPI APP
# =====================

app = FastAPI(title="School Management System API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

# =====================
# SEED DATA
# =====================

def init_db():
    db = SessionLocal()
    
    # Check if admin exists
    admin = db.query(User).filter(User.email == "admin@school.com").first()
    if not admin:
        # Create default admin
        admin_user = User(
            name="Admin User",
            email="admin@school.com",
            phone="1234567890",
            password_hash=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            status="active"
        )
        db.add(admin_user)
        
        # Create teacher
        teacher_user = User(
            name="John Teacher",
            email="teacher@school.com",
            phone="9876543210",
            password_hash=get_password_hash("teacher123"),
            role=UserRole.TEACHER,
            status="active"
        )
        db.add(teacher_user)
        
        # Create student
        student_user = User(
            name="Alice Student",
            email="student@school.com",
            phone="5551234567",
            password_hash=get_password_hash("student123"),
            role=UserRole.STUDENT,
            status="active"
        )
        db.add(student_user)
        db.commit()
        
        # Create student profile
        student_profile = Student(
            user_id=student_user.id,
            admission_no="STU2025001",
            roll_no=1,
            gender="Female"
        )
        db.add(student_profile)
        
        # Create parent
        parent_user = User(
            name="Bob Parent",
            email="parent@school.com",
            phone="5559876543",
            password_hash=get_password_hash("parent123"),
            role=UserRole.PARENT,
            status="active"
        )
        db.add(parent_user)
        db.commit()
        
        parent_profile = Parent(
            user_id=parent_user.id,
            relation_type="Father"
        )
        db.add(parent_profile)
        db.commit()
        
        print("✅ Database initialized with seed data")
    
    db.close()

# Initialize DB on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# =====================
# API ENDPOINTS
# =====================

@app.get("/")
def read_root():
    return {"message": "School Management System API", "version": "1.0.0"}

# Authentication
@app.post("/api/auth/login")
async def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    token = create_access_token({"sub": user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "status": user.status
        }
    }


# Users
@app.post("/api/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_user = User(
        name=user.name,
        email=user.email,
        phone=user.phone,
        password_hash=get_password_hash(user.password),
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/api/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# Dashboard
@app.get("/api/dashboard/{role}")
def get_dashboard(role: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stats = {}
    
    if role == "admin":
        stats = {
            "totalStudents": db.query(Student).count(),
            "totalTeachers": db.query(User).filter(User.role == UserRole.TEACHER).count(),
            "totalClasses": db.query(Class).count(),
            "attendanceToday": 94.5
        }
    elif role == "teacher":
        stats = {
            "classesAssigned": 4,
            "homeworkPending": db.query(Homework).filter(Homework.teacher_id == current_user.id).count(),
            "studentsTotal": 156
        }
    elif role == "student":
        stats = {
            "attendanceRate": 96.5,
            "pendingHomework": 3,
            "upcomingExams": 2
        }
    
    return {
        "stats": stats,
        "recentActivity": [
            {"id": 1, "text": "New homework assigned in Mathematics", "time": "2 hours ago"},
            {"id": 2, "text": "Attendance marked for Class 10-A", "time": "5 hours ago"}
        ],
        "notifications": [
            {"id": 1, "message": "Parent-Teacher meeting on Dec 15", "type": "info", "time": "1 day ago", "read": False}
        ]
    }

# Students
@app.get("/api/students")
def get_students(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    students = db.query(Student).join(User).all()
    result = []
    for s in students:
        result.append({
            "id": s.id,
            "name": s.user.name,
            "class": "10",
            "section": "A",
            "rollNo": s.roll_no,
            "attendance": 96.5
        })
    return {"students": result}

@app.post("/api/students", response_model=StudentResponse)
def create_student(student: StudentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_student = Student(**student.dict())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

# Homework
@app.get("/api/homework")
def get_homework(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    homework_list = [
        {"id": 1, "title": "Algebra Problems Chapter 5", "subject": "Mathematics", "dueDate": "2025-12-15", "status": "pending"},
        {"id": 2, "title": "Physics Lab Report", "subject": "Physics", "dueDate": "2025-12-12", "status": "submitted"},
        {"id": 3, "title": "English Essay on Environment", "subject": "English", "dueDate": "2025-12-18", "status": "pending"}
    ]
    return {"homework": homework_list}

@app.post("/api/homework", response_model=HomeworkResponse)
def create_homework(homework: HomeworkCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can create homework")
    
    db_homework = Homework(
        **homework.dict(),
        teacher_id=current_user.id
    )
    db.add(db_homework)
    db.commit()
    db.refresh(db_homework)
    
    # Broadcast notification via WebSocket
    asyncio.create_task(manager.broadcast({
        "type": "new_homework",
        "message": f"New homework: {homework.title}"
    }))
    
    return db_homework

# Attendance
@app.post("/api/attendance")
def create_attendance(attendance: AttendanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can mark attendance")
    
    db_attendance = AttendanceRecord(
        **attendance.dict(),
        taken_by_teacher_id=current_user.id
    )
    db.add(db_attendance)
    db.commit()
    return {"status": "success", "message": "Attendance marked"}

# Notifications
@app.get("/api/notifications")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notifications = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(10).all()
    return {"notifications": notifications}

# WebSocket for real-time notifications
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast({"message": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)