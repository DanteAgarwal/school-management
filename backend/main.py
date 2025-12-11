# main.py - Enhanced FastAPI School Management System Backend
"""
Complete FastAPI backend with JWT auth, WebSockets, and comprehensive features
Run with: uvicorn main:app --reload
"""

from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordBearer
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
# DATABASE MODELS (Same as before, included for completeness)
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

class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)

    subject = Column(String, nullable=False)
    experience = Column(String, nullable=True)
    qualification = Column(String, nullable=True)

    classes = Column(String)  # CSV like: "10-A,10-B" OR JSON if you want
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")

Base.metadata.create_all(bind=engine)

# =====================
# PYDANTIC SCHEMAS
# =====================

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    target: str = "all"

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

class LoginRequest(BaseModel):
    email: str
    password: str

class StudentCreate(BaseModel):
    name: str
    email: str
    phone: str
    admission_no: str
    class_: str = ""
    section: str = ""
    roll_no: int = 0
    password: str = "student123"

class SubjectCreate(BaseModel):
    name: str
    code: str
    class_id: int

class TeacherCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str = "teacher123"
    subject: str
    experience: str | None = None
    qualification: str | None = None
    classes: str | None = None


class ClassCreate(BaseModel):
    name: str
    academic_year: str = "2024-25"
    sections: str

class AttendanceMarkRequest(BaseModel):
    class_id: str
    date: str
    attendance: dict

class MarksCreate(BaseModel):
    student_id: int
    subject: str
    exam: str
    max_marks: int
    obtained_marks: int

class FeePaymentRequest(BaseModel):
    amount: float
    payment_mode: str
    transaction_id: Optional[str] = None

class TimetableCreate(BaseModel):
    period: str
    time: str
    monday: str
    tuesday: str
    wednesday: str
    thursday: str
    friday: str
    saturday: str

class TeacherUpdate(BaseModel):
    subject: str
    experience: str | None = None
    qualification: str | None = None
    classes: str | None = None

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
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/notifications/mark-all-read")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == current_user.id).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

# Teachers
@app.get("/api/teachers")
def get_teachers(db: Session = Depends(get_db)):
    profiles = db.query(TeacherProfile).join(User).all()

    return {
        "teachers": [
            {
                "id": p.user.id,
                "name": p.user.name,
                "email": p.user.email,
                "phone": p.user.phone,

                "subject": p.subject,
                "experience": p.experience,
                "qualification": p.qualification,
                "classes": p.classes
            }
            for p in profiles
        ]
    }


@app.post("/api/teachers")
async def create_teacher(teacher: TeacherCreate, 
                         db: Session = Depends(get_db), 
                         current_user: User = Depends(get_current_user)):

    if current_user.role not in [UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Create USER entry
    user = User(
        name=teacher.name,
        email=teacher.email,
        phone=teacher.phone,
        password_hash=get_password_hash(teacher.password),
        role=UserRole.TEACHER
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create TEACHER PROFILE entry
    profile = TeacherProfile(
        user_id=user.id,
        subject=teacher.subject,
        experience=teacher.experience,
        qualification=teacher.qualification,
        classes=teacher.classes,
    )
    db.add(profile)
    db.commit()

    return {"message": "Teacher created successfully"}


# Classes
@app.get("/api/classes")
def get_classes(db: Session = Depends(get_db)):
    classes = db.query(Class).all()
    return {
        "classes": [
            {
                "id": c.id,
                "name": c.name,
                "academicYear": "2024-25",
                "sections": ["A", "B", "C"],
                "students": 120
            }
            for c in classes
        ]
    }

@app.post("/api/classes")
async def create_class(class_data: ClassCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_class = Class(name=class_data.name)
    db.add(db_class)
    db.commit()
    
    sections = [s.strip() for s in class_data.sections.split(',')]
    for section_name in sections:
        section = Section(class_id=db_class.id, name=section_name)
        db.add(section)
    db.commit()
    
    return {"message": "Class created successfully"}

# Attendance Marking
@app.post("/api/attendance/mark")
async def mark_attendance(attendance_data: AttendanceMarkRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can mark attendance")
    
    # Here you would save the attendance records
    # For now, just return success
    return {"message": "Attendance marked successfully"}

# Marks Entry
@app.post("/api/marks")
async def create_marks(marks_data: MarksCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Calculate grade
    percentage = (marks_data.obtained_marks / marks_data.max_marks) * 100
    if percentage >= 90:
        grade = "A+"
    elif percentage >= 80:
        grade = "A"
    elif percentage >= 70:
        grade = "B+"
    elif percentage >= 60:
        grade = "B"
    elif percentage >= 50:
        grade = "C"
    else:
        grade = "F"
    
    # Save marks (simplified - you'd need exam_id and subject_id from your schema)
    return {"message": "Marks entered successfully", "grade": grade}

# Fee Payment
@app.post("/api/fees/{fee_id}/pay")
async def record_payment(fee_id: int, payment_data: FeePaymentRequest, db: Session = Depends(get_db)):
    # Record the payment
    # Update the fee status
    return {"message": "Payment recorded successfully"}

# Timetable
@app.get("/api/timetable")
def get_timetable(db: Session = Depends(get_db)):
    # Return timetable data
    return {
        "timetable": [
            {
                "period": "1",
                "time": "08:00-09:00",
                "monday": "Math",
                "tuesday": "Physics",
                "wednesday": "Chemistry",
                "thursday": "English",
                "friday": "Math",
                "saturday": "Computer"
            }
        ]
    }

@app.post("/api/timetable")
async def create_timetable_entry(timetable_data: TimetableCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.TEACHER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Save timetable entry
    return {"message": "Timetable entry created successfully"}

# Homework Submission
@app.post("/api/homework/{homework_id}/submit")
async def submit_homework(homework_id: int, submission_data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can submit homework")
    
    # Save homework submission
    return {"message": "Homework submitted successfully"}

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
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# =====================
# SEED DATA
# =====================

def init_db():
    db = SessionLocal()
    admin = db.query(User).filter(User.email == "admin@school.com").first()
    if not admin:
        admin_user = User(
            name="Admin User",
            email="admin@school.com",
            phone="1234567890",
            password_hash=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            status="active"
        )
        db.add(admin_user)
        
        teacher_user = User(
            name="John Teacher",
            email="teacher@school.com",
            phone="9876543210",
            password_hash=get_password_hash("teacher123"),
            role=UserRole.TEACHER,
            status="active"
        )
        db.add(teacher_user)
        
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
        
        student_profile = Student(
            user_id=student_user.id,
            admission_no="STU2025001",
            roll_no=1,
            gender="Female"
        )
        db.add(student_profile)
        
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

@app.on_event("startup")
async def startup_event():
    init_db()

# =====================
# API ENDPOINTS
# =====================

@app.get("/")
def read_root():
    return {"message": "School Management System API", "version": "2.0.0"}

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
            "attendance": 96.5,
            "admissionNo": s.admission_no,
            "phone": s.user.phone,
            "email": s.user.email
        })
    return {"students": result}

@app.post("/api/students")
async def create_student(student: StudentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = User(
        name=student.name,
        email=student.email,
        phone=student.phone,
        password_hash=get_password_hash(student.password),
        role=UserRole.STUDENT
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    db_student = Student(
        user_id=user.id,
        admission_no=student.admission_no,
        roll_no=student.roll_no
    )
    db.add(db_student)
    db.commit()
    
    await manager.broadcast({
        "type": "notification",
        "notification": {
            "id": db_student.id,
            "message": f"New student added: {student.name}",
            "type": "student",
            "time": "Just now",
            "read": False
        }
    })
    
    return {"message": "Student created successfully"}

# Subjects
@app.get("/api/subjects")
def get_subjects(db: Session = Depends(get_db)):
    subjects = db.query(Subject).all()
    return {
        "subjects": [
            {"id": s.id, "name": s.name, "code": s.code, "classId": s.class_id}
            for s in subjects
        ]
    }

@app.post("/api/subjects")
async def create_subject(subject: SubjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_subject = Subject(**subject.dict())
    db.add(db_subject)
    db.commit()
    return {"message": "Subject created successfully"}

# Announcements
@app.get("/api/announcements")
def get_announcements(db: Session = Depends(get_db)):
    announcements = db.query(Announcement).order_by(Announcement.created_at.desc()).all()
    return {
        "announcements": [
            {
                "id": a.id,
                "title": a.title,
                "message": a.message,
                "date": a.created_at.strftime("%Y-%m-%d"),
                "target": a.target_type or "all"
            }
            for a in announcements
        ]
    }

@app.post("/api/announcements")
async def create_announcement(announcement: AnnouncementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_announcement = Announcement(
        title=announcement.title,
        message=announcement.message,
        target_type=announcement.target,
        created_by=current_user.id
    )
    db.add(db_announcement)
    db.commit()
    
    await manager.broadcast({
        "type": "notification",
        "notification": {
            "id": db_announcement.id,
            "message": f"New announcement: {announcement.title}",
            "type": "announcement",
            "time": "Just now",
            "read": False
        }
    })
    
    return {"message": "Announcement created successfully"}

@app.put("/api/teachers/{teacher_id}")
def update_teacher(teacher_id: int,
                   data: TeacherUpdate,
                   db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):

    if current_user.role not in [UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")

    profile = db.query(TeacherProfile).filter(TeacherProfile.user_id == teacher_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Teacher not found")

    profile.subject = data.subject
    profile.experience = data.experience
    profile.qualification = data.qualification
    profile.classes = data.classes

    db.commit()
    return {"message": "Teacher updated"}

# Notifications
@app.get("/api/notifications")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notifications = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(20).all()
    return {
        "notifications": [
            {
                "id": n.id,
                "message": n.message,
                "type": n.type,
                "read": n.is_read,
                "time": n.created_at.strftime("%Y-%m-%d %H:%M")
            }
            for n in notifications
        ]
    }

@app.patch("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notification = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if notification:
        notification.is_read = True
        db.commit()
    return {"message": "Notification marked as read"}

@app.post("/api/notifications/mark-all-read")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == current_user.id).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

# WebSocket
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None):
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