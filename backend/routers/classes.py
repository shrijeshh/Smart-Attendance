import random, string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, time as dtime

from backend.database import get_db
from backend.models.models import Class, Enrollment, ClassSession, Student
from backend.auth import get_current_professor, get_current_student

router = APIRouter(prefix="/api/classes", tags=["classes"])


def generate_code(course_id: str) -> str:
    suffix = "".join(random.choices(string.digits, k=4))
    return f"{course_id.replace(' ', '')}-{suffix}"


class SessionIn(BaseModel):
    day_of_week: int   # 0=Mon..6=Sun
    start_time: str    # "17:30"
    end_time: str       # "18:45"

class ClassCreate(BaseModel):
    name: str
    course_id: str
    section: Optional[str] = "001"
    semester: str
    min_samples: Optional[int] = 20
    sessions: Optional[list[SessionIn]] = []


def enrich(cls: Class) -> dict:
    samples = [s for e in cls.enrollments for s in e.samples]
    labeled = sum(1 for s in samples if s.labeled)
    unlabeled = len(samples) - labeled
    return {
        "id": cls.id, "name": cls.name, "course_id": cls.course_id,
        "section": cls.section, "semester": cls.semester, "min_samples": cls.min_samples,
        "code": cls.code,
        "student_count": len(cls.enrollments),
        "sample_count": len(samples), "labeled_count": labeled, "unlabeled_count": unlabeled,
        "sessions": [
            {"id": s.id, "day_of_week": s.day_of_week,
             "start_time": s.start_time.strftime("%H:%M"), "end_time": s.end_time.strftime("%H:%M"),
             "verification_open": s.verification_open}
            for s in cls.sessions
        ],
    }


@router.get("/")
def list_classes(prof=Depends(get_current_professor), db: Session = Depends(get_db)):
    classes = db.query(Class).filter(Class.professor_id == prof.id).all()
    return [enrich(c) for c in classes]


@router.post("/", status_code=201)
def create_class(data: ClassCreate, prof=Depends(get_current_professor), db: Session = Depends(get_db)):
    code = generate_code(data.course_id)
    while db.query(Class).filter(Class.code == code).first():
        code = generate_code(data.course_id)

    cls = Class(
        name=data.name, course_id=data.course_id, section=data.section,
        semester=data.semester, min_samples=data.min_samples, code=code, professor_id=prof.id,
    )
    db.add(cls); db.flush()

    for s in data.sessions or []:
        h1, m1 = map(int, s.start_time.split(":"))
        h2, m2 = map(int, s.end_time.split(":"))
        db.add(ClassSession(class_id=cls.id, day_of_week=s.day_of_week,
                             start_time=dtime(h1, m1), end_time=dtime(h2, m2)))
    db.commit(); db.refresh(cls)
    return enrich(cls)


@router.delete("/{class_id}", status_code=204)
def delete_class(class_id: int, prof=Depends(get_current_professor), db: Session = Depends(get_db)):
    cls = db.query(Class).filter(Class.id == class_id, Class.professor_id == prof.id).first()
    if not cls:
        raise HTTPException(404, "Class not found.")
    db.delete(cls); db.commit()


class ToggleVerification(BaseModel):
    session_id: int
    open: bool

@router.post("/sessions/toggle-verification")
def toggle_verification(data: ToggleVerification, prof=Depends(get_current_professor), db: Session = Depends(get_db)):
    sess = db.query(ClassSession).join(Class).filter(
        ClassSession.id == data.session_id, Class.professor_id == prof.id
    ).first()
    if not sess:
        raise HTTPException(404, "Session not found.")
    sess.verification_open = data.open
    db.commit()
    return {"session_id": sess.id, "verification_open": sess.verification_open}


# ---------- Student: join by code ----------
class JoinRequest(BaseModel):
    code: str

@router.post("/join")
def join_class(data: JoinRequest, student=Depends(get_current_student), db: Session = Depends(get_db)):
    cls = db.query(Class).filter(Class.code == data.code.upper()).first()
    if not cls:
        raise HTTPException(404, "Class code not found. Check with your instructor.")
    existing = db.query(Enrollment).filter(
        Enrollment.student_id == student.id, Enrollment.class_id == cls.id
    ).first()
    if existing:
        raise HTTPException(400, "You are already enrolled in this class.")
    enrollment = Enrollment(student_id=student.id, class_id=cls.id)
    db.add(enrollment); db.commit()
    return {
        "class_id": cls.id, "class_name": cls.name, "course_id": cls.course_id,
        "min_samples": cls.min_samples,
    }


@router.get("/my-classes")
def my_classes(student=Depends(get_current_student), db: Session = Depends(get_db)):
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student.id).all()
    result = []
    for e in enrollments:
        cls = e.class_
        labeled = sum(1 for s in e.samples if s.labeled)
        result.append({
            "enrollment_id": e.id, "class_id": cls.id, "class_name": cls.name,
            "course_id": cls.course_id, "min_samples": cls.min_samples,
            "sample_count": labeled,
            "sessions": [
                {"id": s.id, "day_of_week": s.day_of_week,
                 "start_time": s.start_time.strftime("%H:%M"), "end_time": s.end_time.strftime("%H:%M"),
                 "verification_open": s.verification_open}
                for s in cls.sessions
            ],
        })
    return result
