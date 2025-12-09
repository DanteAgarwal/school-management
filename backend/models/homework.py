from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Homework(Base):
    __tablename__ = "homework"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    section_id = Column(Integer, ForeignKey("sections.id"))
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    due_date = Column(DateTime)
    attachment_url = Column(String, nullable=True)
    requires_submission = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    submissions = relationship("HomeworkSubmission", back_populates="homework")

class HomeworkSubmission(Base):
    __tablename__ = "homework_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    homework_id = Column(Integer, ForeignKey("homework.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    submission_text = Column(String, nullable=True)
    file_url = Column(String, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    marks = Column(Integer, nullable=True)
    feedback = Column(String, nullable=True)
    status = Column(String, default="submitted")  # submitted, graded
    
    homework = relationship("Homework", back_populates="submissions")
    student = relationship("Student", back_populates="homework_submissions")
