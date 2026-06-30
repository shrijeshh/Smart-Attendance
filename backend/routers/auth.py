from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional

from backend.database import get_db
from backend.models.models import Professor, Student
from backend.auth import (
    hash_password, verify_password, create_token,
    generate_reset_token, get_current_professor, get_current_student
)
from backend.email_service import send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------- Instructor ----------
class ProfRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

@router.post("/instructor/register")
def register_instructor(req: ProfRegister, db: Session = Depends(get_db)):
    if db.query(Professor).filter(Professor.email == req.email).first():
        raise HTTPException(400, "Email already registered.")
    prof = Professor(name=req.name, email=req.email, hashed_password=hash_password(req.password))
    db.add(prof); db.commit(); db.refresh(prof)
    token = create_token({"sub": prof.email, "role": "instructor"})
    return {"access_token": token, "user": {"id": prof.id, "name": prof.name, "email": prof.email}}

@router.post("/instructor/login")
def login_instructor(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    prof = db.query(Professor).filter(Professor.email == form.username).first()
    if not prof or not verify_password(form.password, prof.hashed_password):
        raise HTTPException(401, "Incorrect email or password.")
    token = create_token({"sub": prof.email, "role": "instructor"})
    return {"access_token": token, "user": {"id": prof.id, "name": prof.name, "email": prof.email}}


# ---------- Student ----------
class StudentRegister(BaseModel):
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    student_id: str
    school_email: EmailStr
    password: str

@router.post("/student/register")
def register_student(req: StudentRegister, db: Session = Depends(get_db)):
    if db.query(Student).filter(Student.school_email == req.school_email).first():
        raise HTTPException(400, "An account with this school email already exists.")
    student = Student(
        first_name=req.first_name, middle_name=req.middle_name, last_name=req.last_name,
        student_id=req.student_id, school_email=req.school_email,
        hashed_password=hash_password(req.password),
    )
    db.add(student); db.commit(); db.refresh(student)
    token = create_token({"sub": student.school_email, "role": "student"})
    return {"access_token": token, "user": {
        "id": student.id, "name": f"{student.first_name} {student.last_name}",
        "email": student.school_email, "has_profile_photo": bool(student.profile_photo)
    }}

@router.post("/student/login")
def login_student(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.school_email == form.username).first()
    if not student or not verify_password(form.password, student.hashed_password):
        raise HTTPException(401, "Incorrect email or password.")
    token = create_token({"sub": student.school_email, "role": "student"})
    return {"access_token": token, "user": {
        "id": student.id, "name": f"{student.first_name} {student.last_name}",
        "email": student.school_email, "has_profile_photo": bool(student.profile_photo)
    }}


# ---------- Forgot password (both roles) ----------
class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    role: str  # "instructor" | "student"

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    token = generate_reset_token()
    expires = datetime.utcnow() + timedelta(minutes=15)

    if req.role == "instructor":
        user = db.query(Professor).filter(Professor.email == req.email).first()
    else:
        user = db.query(Student).filter(Student.school_email == req.email).first()

    # Always return success even if not found, to avoid leaking which emails are registered
    if user:
        user.reset_token = token
        user.reset_expires = expires
        db.commit()
        send_password_reset_email(req.email, token, req.role)

    return {"message": "If an account exists with that email, a reset link has been sent."}


class ResetPasswordRequest(BaseModel):
    token: str
    role: str
    new_password: str

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    Model = Professor if req.role == "instructor" else Student
    user = db.query(Model).filter(Model.reset_token == req.token).first()
    if not user or not user.reset_expires or user.reset_expires < datetime.utcnow():
        raise HTTPException(400, "This reset link is invalid or has expired.")
    user.hashed_password = hash_password(req.new_password)
    user.reset_token = None
    user.reset_expires = None
    db.commit()
    return {"message": "Password updated successfully."}


# ---------- Current user info ----------
@router.get("/instructor/me")
def me_instructor(prof: Professor = Depends(get_current_professor)):
    return {"id": prof.id, "name": prof.name, "email": prof.email}

@router.get("/student/me")
def me_student(student: Student = Depends(get_current_student)):
    return {
        "id": student.id, "name": f"{student.first_name} {student.last_name}",
        "email": student.school_email, "has_profile_photo": bool(student.profile_photo)
    }
