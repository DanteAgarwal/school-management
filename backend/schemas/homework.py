class HomeworkCreate(BaseModel):
    title: str
    description: str
    subject_id: int
    section_id: int
    due_date: datetime
    requires_submission: bool = True

class HomeworkResponse(BaseModel):
    id: int
    title: str
    description: str
    due_date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

class HomeworkSubmissionCreate(BaseModel):
    homework_id: int
    submission_text: Optional[str] = None
    file_url: Optional[str] = None