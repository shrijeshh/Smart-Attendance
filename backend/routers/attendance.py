import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from backend.database import get_db
from backend.models.models import ClassSession, Enrollment, AttendanceRecord, Student, Class
from backend.auth import get_current_student, get_current_professor

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


class VerifyRequest(BaseModel):
    session_id: int
    enrollment_id: int
    captured_image_base64: str   # the live camera frame, matched against profile photo

@router.post("/verify")
def verify_attendance(data: VerifyRequest, student=Depends(get_current_student), db: Session = Depends(get_db)):
    session = db.query(ClassSession).filter(ClassSession.id == data.session_id).first()
    if not session:
        raise HTTPException(404, "Class session not found.")
    if not session.verification_open:
        raise HTTPException(400, "Verification is not currently open for this class.")

    enrollment = db.query(Enrollment).filter(
        Enrollment.id == data.enrollment_id, Enrollment.student_id == student.id
    ).first()
    if not enrollment:
        raise HTTPException(404, "Enrollment not found.")

    if not student.profile_photo:
        raise HTTPException(400, "Please upload a profile photo before verifying.")

    # --- Mock face-match logic ---
    # In production: send captured_image_base64 + student.profile_photo to a face
    # recognition model/service (e.g. AWS Rekognition, Azure Face API, or a
    # self-hosted model like face_recognition / DeepFace) and compare embeddings.
    confidence = random.randint(82, 99)
    result = "success" if confidence >= 85 else "fail"

    record = AttendanceRecord(
        enrollment_id=enrollment.id, session_id=session.id,
        result=result, confidence=confidence,
    )
    db.add(record); db.commit(); db.refresh(record)

    return {"result": result, "confidence": confidence, "verified_at": str(record.verified_at)}


@router.get("/my-records")
def my_records(student=Depends(get_current_student), db: Session = Depends(get_db)):
    enrollment_ids = [e.id for e in student.enrollments]
    records = db.query(AttendanceRecord).filter(AttendanceRecord.enrollment_id.in_(enrollment_ids)).all()
    return [{
        "id": r.id, "session_id": r.session_id, "result": r.result,
        "confidence": r.confidence, "verified_at": str(r.verified_at),
    } for r in records]


@router.get("/class/{class_id}")
def class_records(class_id: int, prof=Depends(get_current_professor), db: Session = Depends(get_db)):
    cls = db.query(Class).filter(Class.id == class_id, Class.professor_id == prof.id).first()
    if not cls:
        raise HTTPException(404, "Class not found.")
    enrollment_ids = [e.id for e in cls.enrollments]
    records = db.query(AttendanceRecord).filter(AttendanceRecord.enrollment_id.in_(enrollment_ids)).all()
    out = []
    for r in records:
        e = next(e for e in cls.enrollments if e.id == r.enrollment_id)
        out.append({
            "student_name": f"{e.student.first_name} {e.student.last_name}",
            "result": r.result, "confidence": r.confidence, "verified_at": str(r.verified_at),
        })
    return out
