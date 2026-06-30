import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.database import init_db, seed_db
from backend.routers import auth, classes, students, samples, attendance

app = FastAPI(title="SmartAttendance API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(classes.router)
app.include_router(students.router)
app.include_router(samples.router)
app.include_router(attendance.router)

@app.get("/api/health")
def health():
    return {"status": "ok"}

frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        return FileResponse(os.path.join(frontend_dir, "index.html"))

@app.on_event("startup")
def startup():
    init_db()
    seed_db()
