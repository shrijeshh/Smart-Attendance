import os
import secrets
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.models import Professor, Student

SECRET_KEY = os.environ.get("SECRET_KEY", "CHANGE_THIS_SECRET_IN_PRODUCTION")
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 24

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def get_current_professor(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Professor:
    exc = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token.")
    if not token:
        raise exc
    try:
        payload = decode_token(token)
        if payload.get("role") != "instructor":
            raise exc
        email = payload.get("sub")
    except JWTError:
        raise exc
    prof = db.query(Professor).filter(Professor.email == email).first()
    if not prof:
        raise exc
    return prof


def get_current_student(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Student:
    exc = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token.")
    if not token:
        raise exc
    try:
        payload = decode_token(token)
        if payload.get("role") != "student":
            raise exc
        email = payload.get("sub")
    except JWTError:
        raise exc
    student = db.query(Student).filter(Student.school_email == email).first()
    if not student:
        raise exc
    return student
