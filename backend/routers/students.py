import base64
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from backend.database import get_db
from backend.models.models import Student, Enrollment, Class
from backend.auth import get_current_professor, get_current_student

router = APIRouter(prefix="/api/students", tags=["students"])


def student_out(e: Enrollment) -> dict:
    s = e.student
    samples = e.samples
    labeled = sum(1 for x in samples if x.labeled)
    varieties = list({x.variety for x in samples if x.variety != "neutral"})
    status = "Complete" if labeled >= e.class_.min_samples else ("In Progress" if labeled > 0 else "Pending")
    return {
        "id": s.id, "enrollment_id": e.id,
        "full_name": f"{s.first_name} {s.last_name}",
        "student_id": s.student_id, "email": s.school_email,
        "class_id": e.class_id, "course_id": e.class_.course_id,
        "has_profile_photo": bool(s.profile_photo),
        "sample_count": len(samples), "labeled_count": labeled,
        "varieties": varieties, "status": status,
    }


@router.get("/")
def list_students(class_id: Optional[int] = None, prof=Depends(get_current_professor), db: Session = Depends(get_db)):
    prof_class_ids = [c.id for c in prof.classes]
    q = db.query(Enrollment).filter(Enrollment.class_id.in_(prof_class_ids))
    if class_id:
        q = q.filter(Enrollment.class_id == class_id)
    return [student_out(e) for e in q.all()]


# ---------- Student profile photo ----------
class PhotoUpload(BaseModel):
    image_base64: str

@router.post("/me/photo")
def upload_profile_photo(data: PhotoUpload, student=Depends(get_current_student), db: Session = Depends(get_db)):
    if not data.image_base64.startswith("data:image"):
        raise HTTPException(400, "Invalid image data.")
    student.profile_photo = data.image_base64
    db.commit()
    return {"message": "Profile photo saved.", "has_profile_photo": True}

@router.get("/me/photo")
def get_profile_photo(student=Depends(get_current_student)):
    return {"image_base64": student.profile_photo}
