class StudentBase(BaseModel):
    admission_no: str
    roll_no: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    address: Optional[str] = None

class StudentCreate(StudentBase):
    user: UserCreate
    section_id: int

class StudentResponse(StudentBase):
    id: int
    user: UserResponse
    
    class Config:
        from_attributes = True