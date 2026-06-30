# SmartAttendance

Full-stack face-detection class management and attendance verification system.

**Stack:** FastAPI · SQLite · Vanilla JS · JWT Auth

---

## What this includes

- **Instructor accounts**: register/login, create classes, generate join codes, set weekly meeting times, open/close facial verification windows, view data, export datasets
- **Student accounts**: register (first/middle/last name, student ID, school email), login, join classes by code, upload a profile photo, submit face samples by appearance variety, verify attendance via the camera during open class windows
- **Forgot password** flow for both roles (sends a reset link by email)
- SQLite database — all data is real and persists between restarts

---

## Part 1 — Run it locally (5 minutes)

You'll need Python 3.10+ installed.

```bash
# 1. Unzip and enter the folder
cd smartattendance

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the server
uvicorn main:app --reload

# 4. Open your browser to:
http://localhost:8000
```

The database starts empty. Register an instructor account, create a class, copy its join code, then register a student account and join with that code.

Without an email service configured, password reset links print to your terminal instead of sending — that's expected and fine for local testing.

---

## Part 2 — Push it to GitHub

```bash
cd smartattendance
git init
git add .
git commit -m "Initial commit"
```

1. Go to [github.com/new](https://github.com/new), create a repository (e.g. `smartattendance`), don't initialize with a README.
2. Connect and push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/smartattendance.git
git branch -M main
git push -u origin main
```

---

## Part 3 — Make it a real, live website

### Step 1: Create a Render.com account
Go to [render.com](https://render.com) and sign up (free, no credit card needed for the free tier).

### Step 2: Deploy from GitHub
1. Click **New +** → **Web Service**
2. Connect your GitHub account, select your `smartattendance` repo
3. Render will detect the `render.yaml` file automatically and pre-fill the settings. If not, set manually:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Click **Create Web Service**

After a couple minutes, Render gives you a live URL like:
```
https://smartattendance-xxxx.onrender.com
```
That's a real, working website. Anyone can visit it.

### Step 3 (optional but recommended): Set up real email sending
Right now, password reset emails just print to the server log. To send real emails:

1. Go to [signup.sendgrid.com](https://signup.sendgrid.com) and create a free account (100 emails/day free)
2. In SendGrid: **Settings → API Keys → Create API Key** (Full Access). Copy the key.
3. In SendGrid: **Settings → Sender Authentication**, verify a sender email (e.g. your own email, or a domain you own)
4. Back in Render: go to your service → **Environment** tab, add:
   - `SENDGRID_API_KEY` = the key you copied
   - `FROM_EMAIL` = the email you verified in step 3
   - `APP_BASE_URL` = your Render URL from Step 2 (e.g. `https://smartattendance-xxxx.onrender.com`)
5. Render redeploys automatically. Reset emails will now actually arrive in inboxes.

### Step 4 (optional): Connect your own domain (e.g. smartattendance.com)
1. Buy the domain from Namecheap, Google Domains, or GoDaddy (~$10–15/year) if you don't already own it
2. In Render: your service → **Settings → Custom Domains → Add Custom Domain**
3. Enter `www.smartattendance.com` (or your domain)
4. Render gives you a CNAME record to add. Go to your domain registrar's DNS settings and add that record
5. Wait 10–60 minutes for DNS to propagate. Your real domain now points at your live app.

---

## Project Structure

```
smartattendance/
├── main.py                       # FastAPI entry point
├── requirements.txt
├── render.yaml                   # Render.com deployment config
├── backend/
│   ├── auth.py                   # JWT auth, password hashing
│   ├── database.py                # SQLAlchemy setup + demo data seeding
│   ├── email_service.py          # SendGrid/SMTP email sending (see comments)
│   ├── models/models.py          # Professor, Student, Class, Enrollment,
│   │                              #   FaceSample, ClassSession, AttendanceRecord
│   └── routers/
│       ├── auth.py               # Login/register/forgot-password (both roles)
│       ├── classes.py            # Create classes, join by code, timetable
│       ├── students.py           # Roster, profile photo upload
│       ├── samples.py            # Face sample upload, labeling, export
│       └── attendance.py         # Verification + attendance records
└── frontend/
    ├── index.html
    ├── css/styles.css
    └── js/
        ├── api.js                # Fetch wrapper, token management
        └── app.js                # All UI logic and rendering
```

---

## About the facial verification

The verification endpoint (`POST /api/attendance/verify`) currently uses **mock matching** — it returns a random confidence score between 82–99% to simulate a real face-match result. This lets you test the entire flow (camera UI, open/close windows, attendance records) without needing a face recognition model.

To make it real, swap the mock logic in `backend/routers/attendance.py` for a call to an actual face matching service, such as:
- **AWS Rekognition** (`CompareFaces` API)
- **Azure Face API**
- **face_recognition** (self-hosted Python library) or **DeepFace**

The student's profile photo (`student.profile_photo`, stored as base64) and the live captured frame (`captured_image_base64` from the request) are the two images you'd compare.

---

## API Reference

Full interactive docs are auto-generated at `/docs` once the server is running (e.g. `http://localhost:8000/docs`).
