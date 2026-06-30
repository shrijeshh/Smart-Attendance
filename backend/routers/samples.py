import csv, io, json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from backend.database import get_db
from backend.models.models import FaceSample, Enrollment, Class, Student
from backend.auth import get_current_professor, get_current_student

router = APIRouter(prefix="/api/samples", tags=["samples"])


class SampleUpload(BaseModel):
    enrollment_id: int
    variety: str
    count: int   # number of images submitted in this batch (files not persisted in this demo)

@router.post("/upload")
def upload_samples(data: SampleUpload, student=Depends(get_current_student), db: Session = Depends(get_db)):
    enrollment = db.query(Enrollment).filter(
        Enrollment.id == data.enrollment_id, Enrollment.student_id == student.id
    ).first()
    if not enrollment:
        raise HTTPException(404, "Enrollment not found.")
    for _ in range(data.count):
        db.add(FaceSample(enrollment_id=enrollment.id, variety=data.variety, labeled=True))
    db.commit()
    return {"message": f"{data.count} sample(s) added.", "variety": data.variety}


@router.get("/unlabeled")
def unlabeled_samples(prof=Depends(get_current_professor), db: Session = Depends(get_db)):
    prof_class_ids = [c.id for c in prof.classes]
    enrollment_ids = [e.id for e in db.query(Enrollment).filter(Enrollment.class_id.in_(prof_class_ids)).all()]
    samples = db.query(FaceSample).filter(
        FaceSample.enrollment_id.in_(enrollment_ids), FaceSample.labeled == False
    ).all()
    return [{"id": s.id, "enrollment_id": s.enrollment_id, "variety": s.variety} for s in samples]


class LabelUpdate(BaseModel):
    sample_ids: list[int]
    enrollment_id: int

@router.post("/label")
def label_samples(data: LabelUpdate, prof=Depends(get_current_professor), db: Session = Depends(get_db)):
    prof_class_ids = [c.id for c in prof.classes]
    valid_enrollment_ids = [e.id for e in db.query(Enrollment).filter(Enrollment.class_id.in_(prof_class_ids)).all()]
    if data.enrollment_id not in valid_enrollment_ids:
        raise HTTPException(403, "Not your class.")
    updated = db.query(FaceSample).filter(FaceSample.id.in_(data.sample_ids)).all()
    for s in updated:
        s.labeled = True
        s.enrollment_id = data.enrollment_id
    db.commit()
    return {"updated": len(updated)}


@router.get("/export")
def export_samples(format: str = "csv", class_id: Optional[int] = None, labeled_only: bool = True,
                    prof=Depends(get_current_professor), db: Session = Depends(get_db)):
    prof_class_ids = [c.id for c in prof.classes]
    if class_id and class_id not in prof_class_ids:
        raise HTTPException(403, "Not your class.")
    target_ids = [class_id] if class_id else prof_class_ids
    enrollments = db.query(Enrollment).filter(Enrollment.class_id.in_(target_ids)).all()

    rows = []
    for e in enrollments:
        q = e.samples
        if labeled_only:
            q = [s for s in q if s.labeled]
        for s in q:
            rows.append({
                "sample_id": s.id, "student_id": e.student.student_id,
                "student_name": f"{e.student.first_name} {e.student.last_name}",
                "class": e.class_.course_id, "variety": s.variety,
                "labeled": s.labeled, "created_at": str(s.created_at),
            })

    if format == "json":
        return StreamingResponse(io.BytesIO(json.dumps(rows, indent=2).encode()),
                                  media_type="application/json",
                                  headers={"Content-Disposition": "attachment; filename=samples.json"})

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["sample_id","student_id","student_name","class","variety","labeled","created_at"])
    for r in rows:
        writer.writerow(r.values())
    output.seek(0)
    return StreamingResponse(io.StringIO(output.getvalue()), media_type="text/csv",
                              headers={"Content-Disposition": "attachment; filename=samples.csv"})
