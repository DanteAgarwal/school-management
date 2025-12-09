from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"
    PARENT = "parent"
    ACCOUNTANT = "accountant"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    student_profile = relationship("Student", back_populates="user", uselist=False)
    teacher_profile = relationship("Teacher", back_populates="user", uselist=False)
    parent_profile = relationship("Parent", back_populates="user", uselist=False)

# ==============================================================================
# models/academic.py
# ==============================================================================

class AcademicYear(Base):
    __tablename__ = "academic_years"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., "2024-2025"
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    classes = relationship("Class", back_populates="academic_year")

class Class(Base):
    __tablename__ = "classes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., "Class 10"
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    academic_year = relationship("AcademicYear", back_populates="classes")
    sections = relationship("Section", back_populates="class_obj")

class Section(Base):
    __tablename__ = "sections"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., "A", "B"
    class_id = Column(Integer, ForeignKey("classes.id"))
    class_teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    capacity = Column(Integer, default=40)
    
    class_obj = relationship("Class", back_populates="sections")
    class_teacher = relationship("Teacher", foreign_keys=[class_teacher_id])
    students = relationship("Student", back_populates="section")

class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True)
    class_id = Column(Integer, ForeignKey("classes.id"))
    description = Column(String, nullable=True)
    
    assignments = relationship("TeacherSubjectAssignment", back_populates="subject")

class TeacherSubjectAssignment(Base):
    __tablename__ = "teacher_subject_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    section_id = Column(Integer, ForeignKey("sections.id"))
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    
    teacher = relationship("Teacher", back_populates="subject_assignments")
    subject = relationship("Subject", back_populates="assignments")

# Student, Teacher, Parent models
class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    admission_no = Column(String, unique=True, nullable=False)
    roll_no = Column(String)
    section_id = Column(Integer, ForeignKey("sections.id"))
    date_of_birth = Column(DateTime)
    gender = Column(String)
    address = Column(String)
    
    user = relationship("User", back_populates="student_profile")
    section = relationship("Section", back_populates="students")
    attendance_records = relationship("AttendanceRecord", back_populates="student")
    homework_submissions = relationship("HomeworkSubmission", back_populates="student")

class Teacher(Base):
    __tablename__ = "teachers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    employee_id = Column(String, unique=True)
    qualification = Column(String)
    specialization = Column(String)
    joining_date = Column(DateTime)
    
    user = relationship("User", back_populates="teacher_profile")
    subject_assignments = relationship("TeacherSubjectAssignment", back_populates="teacher")

class Parent(Base):
    __tablename__ = "parents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    relation_type = Column(String)  # Father, Mother, Guardian
    occupation = Column(String)
    
    user = relationship("User", back_populates="parent_profile")
    children = relationship("StudentParent", back_populates="parent")

# Many-to-Many: Student-Parent
class StudentParent(Base):
    __tablename__ = "student_parents"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    parent_id = Column(Integer, ForeignKey("parents.id"))
    
    parent = relationship("Parent", back_populates="children")