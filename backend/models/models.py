from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Time
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()

class Professor(Base):
    __tablename__ = "professors"
    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String, nullable=False)
    email            = Column(String, unique=True, index=True, nullable=False)
    hashed_password  = Column(String, nullable=False)
    created_at       = Column(DateTime, default=datetime.utcnow)
    reset_token      = Column(String, nullable=True)
    reset_expires    = Column(DateTime, nullable=True)
    classes          = relationship("Class", back_populates="professor", cascade="all, delete")


class Student(Base):
    __tablename__ = "students"
    id               = Column(Integer, primary_key=True, index=True)
    first_name       = Column(String, nullable=False)
    middle_name      = Column(String, nullable=True)
    last_name        = Column(String, nullable=False)
    student_id       = Column(String, nullable=False)
    school_email     = Column(String, unique=True, index=True, nullable=False)
    hashed_password  = Column(String, nullable=False)
    profile_photo    = Column(String, nullable=True)   # path/base64 reference photo for face match
    created_at       = Column(DateTime, default=datetime.utcnow)
    reset_token      = Column(String, nullable=True)
    reset_expires    = Column(DateTime, nullable=True)
    enrollments      = relationship("Enrollment", back_populates="student", cascade="all, delete")


class Class(Base):
    __tablename__ = "classes"
    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String, nullable=False)
    course_id        = Column(String, nullable=False)
    section          = Column(String, default="001")
    semester         = Column(String, nullable=False)
    min_samples      = Column(Integer, default=20)
    code             = Column(String, unique=True, index=True, nullable=False)
    professor_id     = Column(Integer, ForeignKey("professors.id"), nullable=False)
    created_at       = Column(DateTime, default=datetime.utcnow)
    professor        = relationship("Professor", back_populates="classes")
    enrollments      = relationship("Enrollment", back_populates="class_", cascade="all, delete")
    sessions         = relationship("ClassSession", back_populates="class_", cascade="all, delete")


class Enrollment(Base):
    """Links a student to a class they joined via code."""
    __tablename__ = "enrollments"
    id               = Column(Integer, primary_key=True, index=True)
    student_id       = Column(Integer, ForeignKey("students.id"), nullable=False)
    class_id         = Column(Integer, ForeignKey("classes.id"), nullable=False)
    joined_at        = Column(DateTime, default=datetime.utcnow)
    student          = relationship("Student", back_populates="enrollments")
    class_           = relationship("Class", back_populates="enrollments")
    samples          = relationship("FaceSample", back_populates="enrollment", cascade="all, delete")


class FaceSample(Base):
    __tablename__ = "face_samples"
    id               = Column(Integer, primary_key=True, index=True)
    enrollment_id    = Column(Integer, ForeignKey("enrollments.id"), nullable=False)
    variety          = Column(String, default="neutral")
    labeled          = Column(Boolean, default=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    enrollment       = relationship("Enrollment", back_populates="samples")


class ClassSession(Base):
    """Weekly recurring timetable entry for a class (e.g. Mon 5:30-6:45)."""
    __tablename__ = "class_sessions"
    id               = Column(Integer, primary_key=True, index=True)
    class_id         = Column(Integer, ForeignKey("classes.id"), nullable=False)
    day_of_week      = Column(Integer, nullable=False)   # 0=Mon ... 6=Sun
    start_time       = Column(Time, nullable=False)
    end_time         = Column(Time, nullable=False)
    verification_open= Column(Boolean, default=False)    # instructor manually toggles, or auto by window
    class_           = relationship("Class", back_populates="sessions")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id               = Column(Integer, primary_key=True, index=True)
    enrollment_id    = Column(Integer, ForeignKey("enrollments.id"), nullable=False)
    session_id       = Column(Integer, ForeignKey("class_sessions.id"), nullable=False)
    verified_at      = Column(DateTime, default=datetime.utcnow)
    result           = Column(String, default="success")   # success | fail
    confidence       = Column(Integer, nullable=True)       # mock match confidence %
