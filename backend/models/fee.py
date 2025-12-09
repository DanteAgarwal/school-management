from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class FeeHead(Base):
    __tablename__ = "fee_heads"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)

class FeeStructure(Base):
    __tablename__ = "fee_structures"
    
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"))
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    fee_head_id = Column(Integer, ForeignKey("fee_heads.id"))
    amount = Column(Integer, nullable=False)

class StudentFee(Base):
    __tablename__ = "student_fees"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    fee_head_id = Column(Integer, ForeignKey("fee_heads.id"))
    amount_due = Column(Integer)
    due_date = Column(DateTime)
    status = Column(String, default="pending")  # pending, paid, partial

class FeePayment(Base):
    __tablename__ = "fee_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    amount_paid = Column(Integer)
    payment_date = Column(DateTime, server_default=func.now())
    payment_mode = Column(String)
    reference_no = Column(String)
    remarks = Column(String, nullable=True)
