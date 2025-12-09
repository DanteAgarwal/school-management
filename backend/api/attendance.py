from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from database import get_db
from models.attendance import AttendanceRecord
from models.user import User, UserRole
from core.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

class AttendanceCreate(BaseModel):
    student_id: int
    date: date
    status: str  # Present, Absent, Late
    remarks: Optional[str] = None

@router.post("/mark")
async def mark_attendance(
    attendance: List[AttendanceCreate],
    current_user: User = Depends(require_role([UserRole.TEACHER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    teacher_id = current_user.teacher_profile.id if current_user.teacher_profile else None
    
    for att in attendance:
        record = AttendanceRecord(
            student_id=att.student_id,
            date=att.date,
            status=att.status,
            remarks=att.remarks,
            marked_by_teacher_id=teacher_id
        )
        db.add(record)
    
    db.commit()
    return {"message": "Attendance marked successfully"}

@router.get("/student/{student_id}")
async def get_student_attendance(
    student_id: int,
    start_date: date = None,
    end_date: date = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id)
    
    if start_date:
        query = query.filter(AttendanceRecord.date >= start_date)
    if end_date:
        query = query.filter(AttendanceRecord.date <= end_date)
    
    records = query.all()
    
    total = len(records)
    present = len([r for r in records if r.status == "Present"])
    percentage = (present / total * 100) if total > 0 else 0
    
    return {
        "records": records,
        "summary": {
            "total_days": total,
            "present": present,
            "absent": total - present,
            "percentage": round(percentage, 2)
        }
    }