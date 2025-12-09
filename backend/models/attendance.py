from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    date = Column(DateTime, nullable=False)
    status = Column(String)  # Present, Absent, Late, Half-day
    remarks = Column(String, nullable=True)
    marked_by_teacher_id = Column(Integer, ForeignKey("teachers.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    student = relationship("Student", back_populates="attendance_records")
