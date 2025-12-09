from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.homework import Homework, HomeworkSubmission
from models.user import User, UserRole
from schemas.homework import HomeworkCreate, HomeworkResponse
from core.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/homework", tags=["Homework"])

@router.post("/", response_model=HomeworkResponse)
async def create_homework(
    homework: HomeworkCreate,
    current_user: User = Depends(require_role([UserRole.TEACHER])),
    db: Session = Depends(get_db)
):
    teacher_id = current_user.teacher_profile.id
    
    db_homework = Homework(
        title=homework.title,
        description=homework.description,
        subject_id=homework.subject_id,
        section_id=homework.section_id,
        teacher_id=teacher_id,
        due_date=homework.due_date,
        requires_submission=homework.requires_submission
    )
    db.add(db_homework)
    db.commit()
    db.refresh(db_homework)
    
    return db_homework

@router.get("/", response_model=List[HomeworkResponse])
async def get_homework(
    section_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Homework)
    
    if current_user.role == UserRole.STUDENT:
        section_id = current_user.student_profile.section_id
    
    if section_id:
        query = query.filter(Homework.section_id == section_id)
    
    homework_list = query.order_by(Homework.due_date.desc()).all()
    return homework_list

@router.post("/submit")
async def submit_homework(
    homework_id: int,
    submission_text: str = None,
    file: UploadFile = File(None),
    current_user: User = Depends(require_role([UserRole.STUDENT])),
    db: Session = Depends(get_db)
):
    student_id = current_user.student_profile.id
    
    # Check if already submitted
    existing = db.query(HomeworkSubmission).filter(
        HomeworkSubmission.homework_id == homework_id,
        HomeworkSubmission.student_id == student_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already submitted")
    
    file_url = None
    if file:
        # Save file logic here
        file_url = f"/uploads/homework/{file.filename}"
    
    submission = HomeworkSubmission(
        homework_id=homework_id,
        student_id=student_id,
        submission_text=submission_text,
        file_url=file_url
    )
    db.add(submission)
    db.commit()
    
    return {"message": "Homework submitted successfully"}

@router.get("/{homework_id}/submissions")
async def get_homework_submissions(
    homework_id: int,
    current_user: User = Depends(require_role([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    submissions = db.query(HomeworkSubmission).filter(
        HomeworkSubmission.homework_id == homework_id
    ).all()
    
    return submissions