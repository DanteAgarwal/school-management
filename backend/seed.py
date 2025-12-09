from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models.user import User, UserRole
from models.academic import AcademicYear, Class, Section, Subject
from core.security import get_password_hash
import sys

def seed_database():
    db = SessionLocal()
    
    try:
        # Create Academic Year
        academic_year = AcademicYear(
            name="2024-2025",
            start_date="2024-04-01",
            end_date="2025-03-31",
            is_active=True
        )
        db.add(academic_year)
        db.commit()
        db.refresh(academic_year)
        
        # Create Classes
        class_10 = Class(
            name="Class 10",
            academic_year_id=academic_year.id
        )
        db.add(class_10)
        db.commit()
        db.refresh(class_10)
        
        # Create Sections
        section_a = Section(
            name="A",
            class_id=class_10.id,
            capacity=40
        )
        db.add(section_a)
        db.commit()
        db.refresh(section_a)
        
        # Create Subjects
        subjects = ["Mathematics", "Science", "English", "Hindi", "Social Studies"]
        for subject_name in subjects:
            subject = Subject(
                name=subject_name,
                code=subject_name[:4].upper(),
                class_id=class_10.id
            )
            db.add(subject)
        db.commit()
        
        # Create Admin User
        admin_user = User(
            email="admin@school.com",
            phone="9876543210",
            password_hash=get_password_hash("admin123"),
            full_name="Dr. Rajesh Kumar",
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin_user)
        
        # Create Teacher User
        teacher_user = User(
            email="priya@school.com",
            phone="9876543211",
            password_hash=get_password_hash("teacher123"),
            full_name="Priya Sharma",
            role=UserRole.TEACHER,
            is_active=True
        )
        db.add(teacher_user)
        
        # Create Student User
        student_user = User(
            email="arjun@school.com",
            phone="9876543212",
            password_hash=get_password_hash("student123"),
            full_name="Arjun Patel",
            role=UserRole.STUDENT,
            is_active=True
        )
        db.add(student_user)
        
        # Create Parent User
        parent_user = User(
            email="meena@school.com",
            phone="9876543213",
            password_hash=get_password_hash("parent123"),
            full_name="Meena Patel",
            role=UserRole.PARENT,
            is_active=True
        )
        db.add(parent_user)
        
        db.commit()
        
        print("Database seeded successfully!")
        print("\nDemo Credentials:")
        print("Admin: admin@school.com / admin123")
        print("Teacher: priya@school.com / teacher123")
        print("Student: arjun@school.com / student123")
        print("Parent: meena@school.com / parent123")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()