from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.user import User, UserRole
from models.academic import Student
from schemas.student import StudentCreate, StudentResponse
from core.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/students", tags=["Students"])

@router.get("/", response_model=List[StudentResponse])
async def get_students(
    skip: int = 0,
    limit: int = 100,
    section_id: int = None,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TEACHER])),
    db: Session = Depends(get_db)
):
    query = db.query(Student)
    
    if section_id:
        query = query.filter(Student.section_id == section_id)
    
    students = query.offset(skip).limit(limit).all()
    return students

@router.post("/", response_model=StudentResponse)
async def create_student(
    student: StudentCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    # Create user first
    user = User(
        email=student.user.email,
        phone=student.user.phone,
        password_hash=get_password_hash(student.user.password),
        full_name=student.user.full_name,
        role=UserRole.STUDENT
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create student profile
    db_student = Student(
        user_id=user.id,
        admission_no=student.admission_no,
        roll_no=student.roll_no,
        section_id=student.section_id,
        date_of_birth=student.date_of_birth,
        gender=student.gender,
        address=student.address
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    
    return db_student

@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Permission check
    if current_user.role == UserRole.STUDENT:
        if student.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return student
