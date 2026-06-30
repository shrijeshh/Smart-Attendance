import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

from backend.models.models import (
    Base, Professor, Student, Class, Enrollment, FaceSample, ClassSession, AttendanceRecord
)

# Render's free PostgreSQL gives a DATABASE_URL env var automatically once
# the database is created and linked to this service. Falls back to local
# SQLite when that var isn't set, so local development still works without
# needing Postgres installed.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./smartattendance.db")

# Render's Postgres URLs start with "postgres://" but SQLAlchemy 2.x requires
# "postgresql://" — patch it automatically so no manual edits are needed.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_db():
    """No demo data. Every professor and student account starts empty —
    professors create their own classes, students join with the code
    their professor shares with them."""
    pass
