from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Exam(Base):
    __tablename__ = "exams"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    exam_type = Column(String)  # Unit Test, Half-Yearly, Final
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    
    schedules = relationship("ExamSchedule", back_populates="exam")

class ExamSchedule(Base):
    __tablename__ = "exam_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    section_id = Column(Integer, ForeignKey("sections.id"))
    exam_date = Column(DateTime)
    start_time = Column(String)
    end_time = Column(String)
    max_marks = Column(Integer, default=100)
    
    exam = relationship("Exam", back_populates="schedules")
    marks = relationship("Mark", back_populates="exam_schedule")

class Mark(Base):
    __tablename__ = "marks"
    
    id = Column(Integer, primary_key=True, index=True)
    exam_schedule_id = Column(Integer, ForeignKey("exam_schedules.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    marks_obtained = Column(Integer)
    max_marks = Column(Integer)
    grade = Column(String, nullable=True)
    remarks = Column(String, nullable=True)
    
    exam_schedule = relationship("ExamSchedule", back_populates="marks")