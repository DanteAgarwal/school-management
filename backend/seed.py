# seed_data.py - Database Initialization and Seed Script
"""
Run this script to initialize the database with demo data
Usage: python seed_data.py
"""

from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from main import (
    SessionLocal, User, AcademicYear, Class, Section, Subject,
    Student, Parent, StudentParent, AttendanceRecord, Homework,
    Exam, FeeHead, StudentFee, Announcement, Notification,
    UserRole, AttendanceStatus, FeeStatus, get_password_hash
)
import random

def clear_database(db: Session):
    """Clear all existing data"""
    print("🗑️  Clearing existing data...")
    db.query(Notification).delete()
    db.query(Announcement).delete()
    db.query(StudentFee).delete()
    db.query(FeeHead).delete()
    db.query(Exam).delete()
    db.query(Homework).delete()
    db.query(AttendanceRecord).delete()
    db.query(StudentParent).delete()
    db.query(Parent).delete()
    db.query(Student).delete()
    db.query(Subject).delete()
    db.query(Section).delete()
    db.query(Class).delete()
    db.query(AcademicYear).delete()
    db.query(User).delete()
    db.commit()
    print("✅ Database cleared")

def seed_academic_year(db: Session):
    """Create academic year"""
    print("📅 Creating academic year...")
    academic_year = AcademicYear(
        name="2024-2025",
        start_date=date(2024, 4, 1),
        end_date=date(2025, 3, 31),
        is_active=True
    )
    db.add(academic_year)
    db.commit()
    print(f"✅ Academic year created: {academic_year.name}")
    return academic_year

def seed_users(db: Session):
    """Create users with different roles"""
    print("👥 Creating users...")
    
    users = [
        # Super Admin
        User(
            name="Super Admin",
            email="superadmin@school.com",
            phone="1111111111",
            password_hash=get_password_hash("super123"),
            role=UserRole.SUPER_ADMIN,
            status="active"
        ),
        # School Admin
        User(
            name="Principal Kumar",
            email="admin@school.com",
            phone="9876543210",
            password_hash=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            status="active"
        ),
        # Accountant
        User(
            name="Accountant Sharma",
            email="accountant@school.com",
            phone="9876543211",
            password_hash=get_password_hash("accountant123"),
            role=UserRole.ACCOUNTANT,
            status="active"
        )
    ]
    
    # Teachers
    teacher_names = [
        ("John Smith", "Mathematics"),
        ("Sarah Johnson", "Science"),
        ("Michael Brown", "English"),
        ("Emily Davis", "Hindi"),
        ("David Wilson", "Social Studies")
    ]
    
    for name, subject in teacher_names:
        users.append(User(
            name=name,
            email=f"{name.lower().replace(' ', '.')}@school.com",
            phone=f"98765{random.randint(10000, 99999)}",
            password_hash=get_password_hash("teacher123"),
            role=UserRole.TEACHER,
            status="active"
        ))
    
    # Students
    student_names = [
        "Alice Johnson", "Bob Smith", "Charlie Brown", "Diana Prince",
        "Eve Wilson", "Frank Miller", "Grace Lee", "Henry Taylor",
        "Ivy Chen", "Jack Anderson", "Kate Martinez", "Leo Garcia",
        "Mia Rodriguez", "Noah Thomas", "Olivia Moore"
    ]
    
    for name in student_names:
        users.append(User(
            name=name,
            email=f"{name.lower().replace(' ', '.')}@school.com",
            phone=f"98765{random.randint(10000, 99999)}",
            password_hash=get_password_hash("student123"),
            role=UserRole.STUDENT,
            status="active"
        ))
    
    # Parents
    parent_names = [
        "Robert Johnson Sr.", "Maria Smith", "James Brown Sr.",
        "Linda Prince", "William Wilson Sr."
    ]
    
    for name in parent_names:
        users.append(User(
            name=name,
            email=f"{name.lower().replace(' ', '.')}@school.com",
            phone=f"98765{random.randint(10000, 99999)}",
            password_hash=get_password_hash("parent123"),
            role=UserRole.PARENT,
            status="active"
        ))
    
    for user in users:
        db.add(user)
    
    db.commit()
    print(f"✅ Created {len(users)} users")
    return users

def seed_classes_and_sections(db: Session, academic_year: AcademicYear):
    """Create classes and sections"""
    print("🏫 Creating classes and sections...")
    
    classes = []
    class_names = ["9th", "10th", "11th", "12th"]
    
    for class_name in class_names:
        class_obj = Class(
            name=class_name,
            academic_year_id=academic_year.id
        )
        db.add(class_obj)
        db.commit()
        classes.append(class_obj)
        
        # Create sections A, B, C for each class
        for section_name in ["A", "B", "C"]:
            section = Section(
                class_id=class_obj.id,
                name=section_name
            )
            db.add(section)
    
    db.commit()
    print(f"✅ Created {len(classes)} classes with 3 sections each")
    return classes

def seed_subjects(db: Session, classes: list):
    """Create subjects for each class"""
    print("📚 Creating subjects...")
    
    subject_names = [
        ("Mathematics", "MATH"),
        ("Science", "SCI"),
        ("English", "ENG"),
        ("Hindi", "HIN"),
        ("Social Studies", "SST"),
        ("Computer Science", "CS"),
        ("Physical Education", "PE")
    ]
    
    subjects = []
    for class_obj in classes:
        for name, code in subject_names:
            subject = Subject(
                name=name,
                code=f"{code}-{class_obj.name}",
                class_id=class_obj.id
            )
            db.add(subject)
            subjects.append(subject)
    
    db.commit()
    print(f"✅ Created {len(subjects)} subjects")
    return subjects

def seed_students(db: Session, users: list, classes: list):
    """Create student profiles"""
    print("🎓 Creating student profiles...")
    
    student_users = [u for u in users if u.role == UserRole.STUDENT]
    sections = db.query(Section).all()
    
    students = []
    for idx, user in enumerate(student_users):
        section = sections[idx % len(sections)]
        
        student = Student(
            user_id=user.id,
            admission_no=f"STU2025{str(idx+1).zfill(4)}",
            class_id=section.class_id,
            section_id=section.id,
            roll_no=idx + 1,
            dob=date(2008, random.randint(1, 12), random.randint(1, 28)),
            gender=random.choice(["Male", "Female"]),
            address=f"Address {idx+1}, Delhi, India"
        )
        db.add(student)
        students.append(student)
    
    db.commit()
    print(f"✅ Created {len(students)} student profiles")
    return students

def seed_parents(db: Session, users: list, students: list):
    """Create parent profiles and link to students"""
    print("👨‍👩‍👧 Creating parent profiles...")
    
    parent_users = [u for u in users if u.role == UserRole.PARENT]
    
    parents = []
    for idx, user in enumerate(parent_users):
        parent = Parent(
            user_id=user.id,
            relation_type=random.choice(["Father", "Mother", "Guardian"])
        )
        db.add(parent)
        db.commit()
        parents.append(parent)
        
        # Link parent to 2-3 students
        linked_students = random.sample(students, min(3, len(students)))
        for student in linked_students:
            link = StudentParent(
                student_id=student.id,
                parent_id=parent.id
            )
            db.add(link)
    
    db.commit()
    print(f"✅ Created {len(parents)} parent profiles")
    return parents

def seed_attendance(db: Session, students: list, users: list):
    """Create attendance records for last 30 days"""
    print("📊 Creating attendance records...")
    
    teachers = [u for u in users if u.role == UserRole.TEACHER]
    
    attendance_count = 0
    for days_ago in range(30):
        record_date = date.today() - timedelta(days=days_ago)
        
        for student in students:
            # 95% attendance rate
            status = AttendanceStatus.PRESENT if random.random() < 0.95 else AttendanceStatus.ABSENT
            
            attendance = AttendanceRecord(
                student_id=student.id,
                date=record_date,
                status=status,
                remarks="" if status == AttendanceStatus.PRESENT else "No reason provided",
                taken_by_teacher_id=random.choice(teachers).id
            )
            db.add(attendance)
            attendance_count += 1
    
    db.commit()
    print(f"✅ Created {attendance_count} attendance records")

def seed_homework(db: Session, classes: list, subjects: list, users: list):
    """Create homework assignments"""
    print("📝 Creating homework assignments...")
    
    teachers = [u for u in users if u.role == UserRole.TEACHER]
    sections = db.query(Section).all()
    
    homework_titles = [
        "Complete Chapter 5 Exercises",
        "Write an essay on given topic",
        "Solve worksheet problems",
        "Prepare presentation on assigned topic",
        "Lab report submission",
        "Project work - Phase 1",
        "Reading assignment and summary"
    ]
    
    homework_list = []
    for _ in range(20):
        section = random.choice(sections)
        subject = random.choice([s for s in subjects if s.class_id == section.class_id])
        
        homework = Homework(
            class_id=section.class_id,
            section_id=section.id,
            subject_id=subject.id,
            teacher_id=random.choice(teachers).id,
            title=random.choice(homework_titles),
            description="Complete the assigned work and submit before due date.",
            due_date=date.today() + timedelta(days=random.randint(3, 14))
        )
        db.add(homework)
        homework_list.append(homework)
    
    db.commit()
    print(f"✅ Created {len(homework_list)} homework assignments")

def seed_exams(db: Session, academic_year: AcademicYear):
    """Create exam schedules"""
    print("📋 Creating exam schedules...")
    
    exams = [
        Exam(
            name="Unit Test 1",
            type="Unit Test",
            academic_year_id=academic_year.id,
            start_date=date(2024, 7, 15),
            end_date=date(2024, 7, 25)
        ),
        Exam(
            name="Half Yearly Examination",
            type="Half Yearly",
            academic_year_id=academic_year.id,
            start_date=date(2024, 11, 1),
            end_date=date(2024, 11, 15)
        ),
        Exam(
            name="Final Examination",
            type="Final",
            academic_year_id=academic_year.id,
            start_date=date(2025, 3, 1),
            end_date=date(2025, 3, 20)
        )
    ]
    
    for exam in exams:
        db.add(exam)
    
    db.commit()
    print(f"✅ Created {len(exams)} exam schedules")

def seed_fees(db: Session, students: list):
    """Create fee structures and records"""
    print("💰 Creating fee structures...")
    
    # Fee heads
    fee_heads = [
        FeeHead(name="Tuition Fee", description="Monthly tuition fee"),
        FeeHead(name="Transport Fee", description="Monthly transport fee"),
        FeeHead(name="Lab Fee", description="Annual lab fee"),
        FeeHead(name="Library Fee", description="Annual library fee"),
        FeeHead(name="Sports Fee", description="Annual sports fee")
    ]
    
    for head in fee_heads:
        db.add(head)
    
    db.commit()
    
    # Assign fees to students
    fee_count = 0
    for student in students:
        for head in fee_heads[:2]:  # Tuition and Transport only
            student_fee = StudentFee(
                student_id=student.id,
                fee_head_id=head.id,
                amount_due=5000.0 if head.name == "Tuition Fee" else 2000.0,
                amount_paid=random.choice([0, 2500, 5000]) if random.random() < 0.8 else 0,
                due_date=date.today() + timedelta(days=10),
                status=FeeStatus.PAID if random.random() < 0.7 else FeeStatus.PENDING
            )
            db.add(student_fee)
            fee_count += 1
    
    db.commit()
    print(f"✅ Created {fee_count} fee records")

def seed_announcements(db: Session, users: list):
    """Create school announcements"""
    print("📢 Creating announcements...")
    
    admin = next(u for u in users if u.role == UserRole.ADMIN)
    
    announcements = [
        Announcement(
            title="Parent-Teacher Meeting",
            message="Parent-Teacher meeting scheduled for December 15, 2025. All parents are requested to attend.",
            target_type="school",
            created_by=admin.id
        ),
        Announcement(
            title="Winter Break Notice",
            message="School will remain closed from December 25 to January 5 for winter break.",
            target_type="school",
            created_by=admin.id
        ),
        Announcement(
            title="Sports Day Announcement",
            message="Annual Sports Day will be held on December 20, 2025. All students must participate.",
            target_type="school",
            created_by=admin.id
        )
    ]
    
    for announcement in announcements:
        db.add(announcement)
    
    db.commit()
    print(f"✅ Created {len(announcements)} announcements")

def seed_notifications(db: Session, users: list):
    """Create sample notifications"""
    print("🔔 Creating notifications...")
    
    notification_count = 0
    for user in users:
        if user.role in [UserRole.STUDENT, UserRole.PARENT]:
            notifications = [
                Notification(
                    user_id=user.id,
                    type="homework",
                    message="New homework assigned in Mathematics",
                    is_read=False
                ),
                Notification(
                    user_id=user.id,
                    type="announcement",
                    message="Parent-Teacher meeting on December 15",
                    is_read=random.choice([True, False])
                )
            ]
            
            for notif in notifications:
                db.add(notif)
                notification_count += 1
    
    db.commit()
    print(f"✅ Created {notification_count} notifications")

def main():
    """Main seeding function"""
    print("=" * 50)
    print("🌱 SCHOOL MANAGEMENT SYSTEM - DATABASE SEEDING")
    print("=" * 50)
    
    db = SessionLocal()
    
    try:
        # Clear existing data
        clear_database(db)
        
        # Seed data in order
        academic_year = seed_academic_year(db)
        users = seed_users(db)
        classes = seed_classes_and_sections(db, academic_year)
        subjects = seed_subjects(db, classes)
        students = seed_students(db, users, classes)
        parents = seed_parents(db, users, students)
        seed_attendance(db, students, users)
        seed_homework(db, classes, subjects, users)
        seed_exams(db, academic_year)
        seed_fees(db, students)
        seed_announcements(db, users)
        seed_notifications(db, users)
        
        print("\n" + "=" * 50)
        print("✨ DATABASE SEEDING COMPLETED SUCCESSFULLY!")
        print("=" * 50)
        print("\n📊 Summary:")
        print(f"  - Users: {db.query(User).count()}")
        print(f"  - Students: {db.query(Student).count()}")
        print(f"  - Parents: {db.query(Parent).count()}")
        print(f"  - Classes: {db.query(Class).count()}")
        print(f"  - Sections: {db.query(Section).count()}")
        print(f"  - Subjects: {db.query(Subject).count()}")
        print(f"  - Attendance Records: {db.query(AttendanceRecord).count()}")
        print(f"  - Homework: {db.query(Homework).count()}")
        print(f"  - Exams: {db.query(Exam).count()}")
        print(f"  - Announcements: {db.query(Announcement).count()}")
        print(f"  - Notifications: {db.query(Notification).count()}")
        
        print("\n🔐 Demo Login Credentials:")
        print("  - Super Admin: superadmin@school.com / super123")
        print("  - Admin: admin@school.com / admin123")
        print("  - Teacher: john.smith@school.com / teacher123")
        print("  - Student: alice.johnson@school.com / student123")
        print("  - Parent: robert.johnson.sr.@school.com / parent123")
        print("  - Accountant: accountant@school.com / accountant123")
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()