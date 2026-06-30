// ============================================================
//  SmartAttendance — App Logic
// ============================================================

const AVATAR_COLORS = ['#c0392b','#0770a3','#1a7f37','#7b2d8b','#b7540a','#0e6678'];
function initials(name) { return name.split(' ').map(n => n[0]).join('').toUpperCase(); }
function avatarHTML(name, i) { return `<div class="avatar" style="background:${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${initials(name)}</div>`; }

const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

let state = {
  classes: [], students: [], unlabeled: [],
  myClasses: [], hasProfilePhoto: false, profilePhotoData: null,
  studentSamplesByEnrollment: {},  // { enrollmentId: { variety: count } }
};

const VARIETIES = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'glasses', label: 'With Glasses' },
  { id: 'makeup',  label: 'With Makeup' },
  { id: 'hair',    label: 'Hair Style' },
];

// ---- Auth role tabs (top level) ----
let authRole = 'instructor';
function setAuthRole(role) {
  authRole = role;
  document.getElementById('role-tab-instructor').classList.toggle('active', role === 'instructor');
  document.getElementById('role-tab-student').classList.toggle('active', role === 'student');
  document.getElementById('auth-instructor').style.display = role === 'instructor' ? 'block' : 'none';
  document.getElementById('auth-student').style.display    = role === 'student'    ? 'block' : 'none';
}

function showAuthForm(role, mode) {
  if (role === 'instructor') {
    document.getElementById('instructor-login-form').style.display    = mode === 'login' ? 'block' : 'none';
    document.getElementById('instructor-register-form').style.display = mode === 'register' ? 'block' : 'none';
    document.getElementById('itab-login').classList.toggle('active', mode === 'login');
    document.getElementById('itab-register').classList.toggle('active', mode === 'register');
  } else {
    document.getElementById('student-login-form').style.display    = mode === 'login' ? 'block' : 'none';
    document.getElementById('student-register-form').style.display = mode === 'register' ? 'block' : 'none';
    document.getElementById('stab-login').classList.toggle('active', mode === 'login');
    document.getElementById('stab-register').classList.toggle('active', mode === 'register');
  }
}

// ---- Forgot password ----
let forgotRole = 'instructor';
function openForgotPassword(role) {
  forgotRole = role;
  document.getElementById('forgot-step-1').style.display = 'block';
  document.getElementById('forgot-step-2').style.display = 'none';
  document.getElementById('forgot-error').style.display = 'none';
  document.getElementById('forgot-email').value = '';
  openModal('forgot');
}

async function submitForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim();
  const err = document.getElementById('forgot-error');
  err.style.display = 'none';
  if (!email) { err.textContent = 'Please enter your email.'; err.style.display = 'block'; return; }
  try {
    await API.auth.forgotPassword(email, forgotRole);
    document.getElementById('forgot-step-1').style.display = 'none';
    document.getElementById('forgot-step-2').style.display = 'block';
  } catch (e) {
    err.textContent = e.message; err.style.display = 'block';
  }
}

// ---- Instructor auth ----
async function handleInstructorLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('ilogin-btn'); btn.disabled = true; btn.textContent = 'Signing in…';
  const err = document.getElementById('ilogin-error'); err.style.display = 'none';
  try {
    await API.auth.loginInstructor(document.getElementById('ilogin-email').value, document.getElementById('ilogin-password').value);
    enterApp();
  } catch (ex) { err.textContent = ex.message; err.style.display = 'block'; }
  finally { btn.disabled = false; btn.textContent = 'Sign In'; }
}

async function handleInstructorRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('ireg-btn'); btn.disabled = true; btn.textContent = 'Creating…';
  const err = document.getElementById('ireg-error'); err.style.display = 'none';
  try {
    await API.auth.registerInstructor(
      document.getElementById('ireg-name').value,
      document.getElementById('ireg-email').value,
      document.getElementById('ireg-password').value
    );
    enterApp();
  } catch (ex) { err.textContent = ex.message; err.style.display = 'block'; }
  finally { btn.disabled = false; btn.textContent = 'Create Account'; }
}

// ---- Student auth ----
async function handleStudentLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('slogin-btn'); btn.disabled = true; btn.textContent = 'Signing in…';
  const err = document.getElementById('slogin-error'); err.style.display = 'none';
  try {
    await API.auth.loginStudent(document.getElementById('slogin-email').value, document.getElementById('slogin-password').value);
    enterApp();
  } catch (ex) { err.textContent = ex.message; err.style.display = 'block'; }
  finally { btn.disabled = false; btn.textContent = 'Sign In'; }
}

async function handleStudentRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('sreg-btn'); btn.disabled = true; btn.textContent = 'Creating…';
  const err = document.getElementById('sreg-error'); err.style.display = 'none';
  try {
    await API.auth.registerStudent({
      first_name:  document.getElementById('sreg-first').value,
      middle_name: document.getElementById('sreg-middle').value || null,
      last_name:   document.getElementById('sreg-last').value,
      student_id:  document.getElementById('sreg-sid').value,
      school_email:document.getElementById('sreg-email').value,
      password:    document.getElementById('sreg-password').value,
    });
    enterApp();
  } catch (ex) { err.textContent = ex.message; err.style.display = 'block'; }
  finally { btn.disabled = false; btn.textContent = 'Create Account'; }
}

function handleLogout() { API.auth.logout(); location.reload(); }

// ---- Enter app (post login) ----
function enterApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = 'block';
  const role = API.getRole();
  const user = API.getUser();

  document.getElementById('nav-instructor').style.display = role === 'instructor' ? 'block' : 'none';
  document.getElementById('nav-student').style.display    = role === 'student'    ? 'block' : 'none';
  document.getElementById('sidebar-role-label').textContent = role === 'instructor' ? 'Instructor Portal' : 'Student Portal';
  document.getElementById('topbar-role-badge').textContent  = role === 'instructor' ? 'Instructor' : 'Student';
  document.getElementById('topbar-role-badge').className    = role === 'instructor' ? 'badge badge-info' : 'badge badge-success';

  if (user) {
    document.getElementById('sidebar-username').textContent = user.name;
    document.getElementById('topbar-avatar').textContent = initials(user.name);
    document.getElementById('topbar-avatar').style.background = role === 'instructor' ? 'var(--red)' : 'var(--green)';
  }

  if (role === 'instructor') {
    navigate('dashboard');
    loadInstructorData();
  } else {
    state.hasProfilePhoto = user?.has_profile_photo || false;
    navigate('student-join');
    loadStudentData();
  }
}

// ---- Routing ----
const PAGE_LABELS = {
  dashboard:'Dashboard', classes:'Classes', students:'Students', timetable:'Timetable & Verification',
  viewdata:'View Data', export:'Export Data', unlabeled:'Unlabeled Samples',
  'student-join':'Join a Class', 'student-profile':'Profile Photo', 'student-submit':'Submit Samples',
  'student-verify':'Class Verification', 'student-status':'My Progress',
};

function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + pageId));
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.toggle('active', el.dataset.page === pageId));
  document.getElementById('breadcrumb-page').textContent = PAGE_LABELS[pageId] || pageId;
  if (pageId === 'viewdata') renderViewData();
  if (pageId === 'timetable') renderTimetable();
  if (pageId === 'student-submit') renderStudentSubmit();
  if (pageId === 'student-verify') renderStudentVerify();
  if (pageId === 'student-status') renderStudentStatus();
  if (pageId === 'student-profile') renderProfilePhoto();
}

// ============================================================
//  INSTRUCTOR
// ============================================================
async function loadInstructorData() {
  try {
    const [classes, students, unlabeled] = await Promise.all([API.classes.list(), API.students.list(), API.samples.unlabeled()]);
    state.classes = classes || []; state.students = students || []; state.unlabeled = unlabeled || [];
    renderDashboard(); renderClasses(); renderStudents(state.students); renderUnlabeled(); populateFilters();
    document.getElementById('unlabeled-badge').textContent = state.unlabeled.length;
  } catch (e) { showToast('Failed to load data.'); }
}

function renderDashboard() {
  const totalSamples = state.students.reduce((a,s)=>a+s.sample_count,0);
  const labeled      = state.students.reduce((a,s)=>a+s.labeled_count,0);
  document.getElementById('stat-classes').textContent  = state.classes.length;
  document.getElementById('stat-students').textContent = state.students.length;
  document.getElementById('stat-samples').textContent  = totalSamples.toLocaleString();
  document.getElementById('stat-labeled-sub').textContent = `Labeled: ${labeled.toLocaleString()}`;
  document.getElementById('stat-unlabeled').textContent = state.unlabeled.length;
  renderClassCards('classes-grid-dashboard');
}

const STRIPE_COLORS = ['', 'blue', 'green'];
function classCardHTML(cls, idx) {
  const minNeeded = cls.student_count * cls.min_samples;
  const pct = minNeeded ? Math.min(100, Math.round(cls.labeled_count / minNeeded * 100)) : 0;
  const fillClass = pct < 50 ? 'low' : pct < 80 ? 'mid' : 'high';
  const stripe = STRIPE_COLORS[idx % 3];
  return `
    <div class="class-card">
      <div class="class-stripe ${stripe}"></div>
      <div class="class-body">
        <div class="class-name">${cls.name}</div>
        <div class="class-meta-line">${cls.course_id} &middot; Section ${cls.section} &middot; ${cls.semester}</div>
        <div class="class-stats">
          <div class="class-stat"><strong>${cls.student_count}</strong>Students</div>
          <div class="class-stat"><strong>${cls.sample_count}</strong>Samples</div>
          <div class="class-stat"><strong>${cls.min_samples}</strong>Min/Variety</div>
        </div>
        <div class="class-code-box">
          <div><div class="class-code-label">Class Code</div><div class="class-code-value">${cls.code}</div></div>
          <button class="copy-btn" onclick="copyCode('${cls.code}')">Copy</button>
        </div>
        <div class="progress-row">
          <div class="progress-bar"><div class="progress-fill ${fillClass}" style="width:${pct}%"></div></div>
          <span class="progress-label">${pct}% sampled</span>
        </div>
      </div>
      <div class="class-footer">
        <button class="btn btn-sm btn-secondary" onclick="navigate('students')">Students</button>
        <button class="btn btn-sm btn-secondary" onclick="navigate('timetable')">Timetable</button>
        <button class="btn btn-sm btn-danger" onclick="deleteClass(${cls.id})">Delete</button>
      </div>
    </div>`;
}

function renderClassCards(containerId) {
  const el = document.getElementById(containerId); if (!el) return;
  el.innerHTML = state.classes.length ? state.classes.map((c,i)=>classCardHTML(c,i)).join('')
    : '<p style="color:var(--text-sub);padding:8px">No classes yet. Create your first class above.</p>';
}

function renderClasses() { renderClassCards('classes-grid-dashboard'); renderClassCards('classes-grid-page'); }
function copyCode(code) { navigator.clipboard?.writeText(code).catch(()=>{}); showToast('Class code copied: ' + code); }

async function deleteClass(id) {
  if (!confirm('Delete this class and all its data? This cannot be undone.')) return;
  try { await API.classes.delete(id); showToast('Class deleted.'); loadInstructorData(); }
  catch (e) { showToast('Error: ' + e.message); }
}

function statusBadge(status) {
  const map = { 'Complete':'badge-success', 'In Progress':'badge-warning', 'Pending':'badge-neutral' };
  return `<span class="badge ${map[status]||'badge-neutral'}">${status}</span>`;
}

function renderStudents(list) {
  const tbody = document.getElementById('students-tbody'); if (!tbody) return;
  const filter = document.getElementById('student-class-filter');
  if (filter) {
    const existing = [...filter.options].map(o => o.value);
    state.classes.forEach(c => { if (!existing.includes(String(c.id))) { const o=document.createElement('option'); o.value=c.id; o.textContent=c.course_id+' — '+c.name; filter.appendChild(o); } });
  }
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-sub);padding:24px">No students have joined yet.</td></tr>'; return; }
  tbody.innerHTML = list.map((s,i) => {
    const pct = Math.min(100, Math.round(s.labeled_count/30*100));
    const fillClass = pct<40?'low':pct<70?'mid':'high';
    return `<tr>
      <td><div class="student-cell">${avatarHTML(s.full_name,i)}<span>${s.full_name}</span></div></td>
      <td style="color:var(--text-sub)">${s.student_id||'—'}</td>
      <td><span class="badge badge-info">${s.course_id}</span></td>
      <td>${s.has_profile_photo ? '<span class="badge badge-success">Uploaded</span>' : '<span class="badge badge-neutral">Missing</span>'}</td>
      <td><div style="display:flex;align-items:center;gap:6px"><div class="progress-bar" style="width:70px"><div class="progress-fill ${fillClass}" style="width:${pct}%"></div></div><span style="font-size:11px;color:var(--text-sub)">${s.labeled_count}/30</span></div></td>
      <td>${statusBadge(s.status)}</td>
    </tr>`;
  }).join('');
}

function filterStudents() {
  const q = document.getElementById('student-search').value.toLowerCase();
  const cid = document.getElementById('student-class-filter').value;
  renderStudents(state.students.filter(s => (s.full_name.toLowerCase().includes(q) || (s.student_id||'').toLowerCase().includes(q)) && (!cid || String(s.class_id)===cid)));
}

// ---- Timetable & verification control ----
function renderTimetable() {
  const container = document.getElementById('timetable-classes');
  if (!state.classes.length) { container.innerHTML = '<p style="color:var(--text-sub)">Create a class first.</p>'; return; }
  container.innerHTML = state.classes.map(cls => `
    <div class="card">
      <div class="card-header"><span class="card-title">${cls.course_id} — ${cls.name}</span></div>
      <div class="card-body" style="padding:0">
        ${(cls.sessions||[]).length ? cls.sessions.map(s => {
          const live = s.verification_open;
          return `
          <div class="schedule-row">
            <div class="schedule-day"><span class="schedule-status-dot ${live?'live':''}"></span>${DAY_NAMES[s.day_of_week]}</div>
            <div class="schedule-time">${s.start_time} &ndash; ${s.end_time}</div>
            <div>
              ${live
                ? `<button class="btn btn-sm btn-danger" onclick="toggleVerify(${s.id}, false)">Close Verification</button>`
                : `<button class="btn btn-sm btn-primary" onclick="toggleVerify(${s.id}, true)">Open Verification</button>`}
            </div>
          </div>`;
        }).join('') : '<div style="padding:14px;color:var(--text-sub);font-size:13px">No meeting times set for this class.</div>'}
      </div>
    </div>`).join('');
}

async function toggleVerify(sessionId, open) {
  try {
    await API.classes.toggleVerification(sessionId, open);
    showToast(open ? 'Verification opened for this session.' : 'Verification closed.');
    await loadInstructorData();
    renderTimetable();
  } catch (e) { showToast('Error: ' + e.message); }
}

// ---- View data ----
function renderViewData() {
  const tbody = document.getElementById('class-data-tbody');
  if (tbody) tbody.innerHTML = state.classes.map(cls => {
    const pct = cls.student_count ? Math.min(100, Math.round(cls.labeled_count/(cls.student_count*cls.min_samples)*100)) : 0;
    const bc = pct>=90?'badge-success':pct>=70?'badge-warning':'badge-error';
    return `<tr><td><strong>${cls.course_id}</strong> &mdash; ${cls.name}</td><td>${cls.student_count}</td><td>${cls.sample_count}</td><td>${cls.labeled_count}</td><td style="color:var(--yellow)">${cls.unlabeled_count}</td><td><span class="badge ${bc}">${pct}%</span></td></tr>`;
  }).join('');
  const itbody = document.getElementById('individual-tbody');
  if (itbody) itbody.innerHTML = state.students.map((s,i) => `<tr><td><div class="student-cell">${avatarHTML(s.full_name,i)}<span>${s.full_name}</span></div></td><td>${s.course_id}</td><td>${s.sample_count}</td><td style="color:var(--text-sub)">${(s.varieties||[]).join(', ')||'—'}</td><td>${statusBadge(s.status)}</td></tr>`).join('');
}

// ---- Unlabeled ----
function renderUnlabeled() {
  const grid = document.getElementById('unlabeled-grid'); if (!grid) return;
  const items = state.unlabeled.slice(0, 18);
  if (!items.length) { grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-sub);padding:32px">No unlabeled samples — all caught up.</div>'; return; }
  const varLabels = ['Neutral','Glasses','Makeup','Hair'];
  grid.innerHTML = items.map((s,i) => `
    <div class="face-thumb" data-id="${s.id}" onclick="this.classList.toggle('selected')">
      <div class="face-thumb-check"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
      <div class="face-thumb-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg></div>
      <div class="face-thumb-id">#${s.id}</div>
      <div class="face-thumb-var">${varLabels[i % varLabels.length]}</div>
    </div>`).join('');
  const sel = document.getElementById('label-student-select');
  sel.innerHTML = '<option value="">— Select student —</option>' + state.students.map(s => `<option value="${s.enrollment_id}">${s.full_name} (${s.course_id})</option>`).join('');
}

async function assignLabel() {
  const enrollmentId = parseInt(document.getElementById('label-student-select').value);
  if (!enrollmentId) { showToast('Please select a student.'); return; }
  const selected = [...document.querySelectorAll('.face-thumb.selected')].map(el => parseInt(el.dataset.id));
  if (!selected.length) { showToast('Please select at least one sample.'); return; }
  try { const res = await API.samples.label(selected, enrollmentId); showToast(`${res.updated} sample(s) labeled.`); loadInstructorData(); }
  catch (e) { showToast('Error: ' + e.message); }
}

function populateFilters() {
  const opts = state.classes.map(c => `<option value="${c.id}">${c.course_id} — ${c.name}</option>`).join('');
  document.getElementById('export-class-filter').innerHTML = '<option value="">All classes</option>' + opts;
}

function selectExportFormat(el) { document.querySelectorAll('.export-opt').forEach(e=>e.classList.remove('selected')); el.classList.add('selected'); }
function triggerExport() { showToast('Export started — download will begin shortly.'); }

async function createClass() {
  const name = document.getElementById('new-class-name').value.trim();
  const course_id = document.getElementById('new-class-courseid').value.trim();
  const section = document.getElementById('new-class-section').value.trim() || '001';
  const semester = document.getElementById('new-class-semester').value;
  const min_samples = parseInt(document.getElementById('new-class-minsamples').value) || 20;
  const day = parseInt(document.getElementById('new-class-day').value);
  const start = document.getElementById('new-class-start').value;
  const end = document.getElementById('new-class-end').value;
  if (!name || !course_id) { showToast('Class name and course ID are required.'); return; }
  try {
    await API.classes.create({ name, course_id, section, semester, min_samples, sessions: [{ day_of_week: day, start_time: start, end_time: end }] });
    closeModal('new-class');
    document.getElementById('new-class-name').value = ''; document.getElementById('new-class-courseid').value = '';
    showToast(`Class "${name}" created. Share the class code with your students.`);
    loadInstructorData();
  } catch (e) { showToast('Error: ' + e.message); }
}

// ============================================================
//  STUDENT
// ============================================================
async function loadStudentData() {
  try {
    state.myClasses = await API.classes.myClasses() || [];
    renderMyClasses();
    populateStudentClassDropdowns();
  } catch (e) { /* not joined yet, fine */ }
  try {
    const photo = await API.students.getPhoto();
    state.profilePhotoData = photo?.image_base64 || null;
    state.hasProfilePhoto = !!state.profilePhotoData;
  } catch (e) {}
}

function renderMyClasses() {
  const card = document.getElementById('my-classes-card');
  const list = document.getElementById('my-classes-list');
  if (!state.myClasses.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  list.innerHTML = state.myClasses.map(c => `
    <div style="padding:10px 0;border-bottom:1px solid var(--border-light)">
      <strong>${c.course_id}</strong> — ${c.class_name}<br>
      <span style="font-size:12px;color:var(--text-sub)">${c.sample_count} samples submitted</span>
    </div>`).join('');
}

async function joinClass() {
  const code = document.getElementById('join-code-input').value.trim();
  const err = document.getElementById('join-error'); err.style.display = 'none';
  if (!code) { err.textContent = 'Please enter a class code.'; err.style.display = 'block'; return; }
  try {
    const result = await API.classes.join(code);
    showToast(`Joined ${result.class_name} successfully.`);
    document.getElementById('join-code-input').value = '';
    await loadStudentData();
    navigate(state.hasProfilePhoto ? 'student-submit' : 'student-profile');
  } catch (e) { err.textContent = e.message; err.style.display = 'block'; }
}

function populateStudentClassDropdowns() {
  const opts = state.myClasses.map(c => `<option value="${c.enrollment_id}">${c.course_id} — ${c.class_name}</option>`).join('');
  ['submit-class-select','verify-class-select','status-class-select'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = opts || '<option>No classes joined</option>';
  });
}

function getCurrentMyClass(selectId) {
  const enrollmentId = parseInt(document.getElementById(selectId)?.value);
  return state.myClasses.find(c => c.enrollment_id === enrollmentId);
}

// ---- Profile photo ----
function renderProfilePhoto() {
  const box = document.getElementById('profile-photo-box');
  if (state.profilePhotoData) {
    box.innerHTML = `<img src="${state.profilePhotoData}">`;
    box.classList.add('has-photo');
  } else {
    box.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
    box.classList.remove('has-photo');
  }
}

function handlePhotoSelect(e) {
  const file = e.target.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const dataUrl = ev.target.result;
    try {
      await API.students.uploadPhoto(dataUrl);
      state.profilePhotoData = dataUrl; state.hasProfilePhoto = true;
      renderProfilePhoto();
      showToast('Profile photo saved.');
    } catch (err) { showToast('Error: ' + err.message); }
  };
  reader.readAsDataURL(file);
}

// ---- Submit samples ----
let activeVariety = 'neutral';

function renderStudentSubmit() {
  if (!state.myClasses.length) { document.getElementById('student-not-joined').style.display='flex'; document.getElementById('student-submit-form').style.display='none'; return; }
  document.getElementById('student-not-joined').style.display='none';
  document.getElementById('student-submit-form').style.display='block';
  populateStudentClassDropdowns();
  onSubmitClassChange();
}

function onSubmitClassChange() {
  const cls = getCurrentMyClass('submit-class-select');
  if (!cls) return;
  document.getElementById('min-samples-label').textContent = `${cls.min_samples} samples`;
  renderVarietyGrid();
}

function renderVarietyGrid() {
  const cls = getCurrentMyClass('submit-class-select');
  if (!cls) return;
  const counts = state.studentSamplesByEnrollment[cls.enrollment_id] || {};
  const grid = document.getElementById('variety-grid');
  grid.innerHTML = VARIETIES.map(v => {
    const count = counts[v.id] || 0;
    const done = count >= cls.min_samples;
    const active = v.id === activeVariety;
    return `<div class="variety-item ${done?'done':''} ${active?'active':''}" onclick="selectVariety('${v.id}')">
      <div class="variety-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg></div>
      <div class="variety-name">${v.label}</div>
      <div class="variety-count">${count} / ${cls.min_samples}${done ? ' &#10003;' : ''}</div>
    </div>`;
  }).join('');
  document.getElementById('upload-variety-title').textContent = 'Upload — ' + (VARIETIES.find(v=>v.id===activeVariety)?.label || '');
}

function selectVariety(id) { activeVariety = id; renderVarietyGrid(); }

async function uploadSamples() {
  const cls = getCurrentMyClass('submit-class-select');
  const input = document.getElementById('sample-upload-input');
  const count = input.files?.length || 0;
  if (!cls) { showToast('Select a class first.'); return; }
  if (!count) { showToast('Please select image files first.'); return; }
  try {
    await API.samples.upload(cls.enrollment_id, activeVariety, count);
    if (!state.studentSamplesByEnrollment[cls.enrollment_id]) state.studentSamplesByEnrollment[cls.enrollment_id] = {};
    state.studentSamplesByEnrollment[cls.enrollment_id][activeVariety] = (state.studentSamplesByEnrollment[cls.enrollment_id][activeVariety] || 0) + count;
    input.value = '';
    showToast(`${count} sample(s) uploaded.`);
    renderVarietyGrid();
    await loadStudentData();
  } catch (e) { showToast('Error: ' + e.message); }
}

// ---- Verification ----
function renderStudentVerify() {
  if (!state.myClasses.length) { document.getElementById('verify-not-joined').style.display='flex'; document.getElementById('verify-content').style.display='none'; return; }
  document.getElementById('verify-not-joined').style.display='none';
  document.getElementById('verify-content').style.display='block';
  populateStudentClassDropdowns();
  onVerifyClassChange();
}

function onVerifyClassChange() {
  const cls = getCurrentMyClass('verify-class-select');
  const banner = document.getElementById('verify-banner');
  const title  = document.getElementById('verify-banner-title');
  const sub    = document.getElementById('verify-banner-sub');
  const btn    = document.getElementById('verify-now-btn');
  if (!cls) return;
  const openSession = (cls.sessions || []).find(s => s.verification_open);
  if (openSession) {
    banner.className = 'verify-banner live';
    title.textContent = 'Verification Open';
    sub.textContent = `${DAY_NAMES[openSession.day_of_week]}, ${openSession.start_time}–${openSession.end_time}. You can verify now.`;
    btn.disabled = !state.hasProfilePhoto;
    btn.dataset.sessionId = openSession.id;
    btn.dataset.enrollmentId = cls.enrollment_id;
    if (!state.hasProfilePhoto) { btn.textContent = 'Upload a profile photo first'; }
    else { btn.textContent = 'Verify Now'; }
  } else {
    banner.className = 'verify-banner closed';
    title.textContent = 'Verification Closed';
    sub.textContent = "Your instructor hasn't opened verification for this class yet.";
    btn.disabled = true;
    btn.textContent = 'Verify Now';
  }
  document.getElementById('verify-result').style.display = 'none';
}

async function runVerification() {
  const btn = document.getElementById('verify-now-btn');
  const sessionId = parseInt(btn.dataset.sessionId);
  const enrollmentId = parseInt(btn.dataset.enrollmentId);
  if (!sessionId || !enrollmentId) return;
  btn.disabled = true; btn.textContent = 'Verifying…';
  try {
    // In production this would capture a live frame from the device camera.
    // Here we send the stored profile photo itself as a stand-in capture.
    const result = await API.attendance.verify(sessionId, enrollmentId, state.profilePhotoData || 'mock-frame');
    const box = document.getElementById('verify-result');
    box.style.display = 'block';
    box.className = 'verify-result ' + (result.result === 'success' ? 'success' : 'fail');
    box.textContent = result.result === 'success'
      ? `Verified — match confidence ${result.confidence}%. Attendance recorded.`
      : `Verification failed — confidence ${result.confidence}%. Please try again or contact your instructor.`;
    showToast(result.result === 'success' ? 'Attendance verified.' : 'Verification failed.');
  } catch (e) {
    showToast('Error: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Verify Now';
  }
}

// ---- Status ----
async function renderStudentStatus() {
  if (!state.myClasses.length) { document.getElementById('status-not-joined').style.display='flex'; document.getElementById('status-content').style.display='none'; return; }
  document.getElementById('status-not-joined').style.display='none';
  document.getElementById('status-content').style.display='block';
  populateStudentClassDropdowns();
  const cls = getCurrentMyClass('status-class-select');
  if (!cls) return;
  document.getElementById('status-class-name').textContent = cls.class_name;
  document.getElementById('status-sample-count').textContent = cls.sample_count;
  document.getElementById('status-required').textContent = (cls.min_samples * VARIETIES.length) + ' total';
  try {
    const records = await API.attendance.myRecords();
    const tbody = document.getElementById('status-attendance-tbody');
    if (!records.length) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-sub);padding:18px">No verification records yet.</td></tr>'; return; }
    tbody.innerHTML = records.map(r => `<tr>
      <td>${new Date(r.verified_at).toLocaleString()}</td>
      <td>${r.result === 'success' ? '<span class="badge badge-success">Verified</span>' : '<span class="badge badge-error">Failed</span>'}</td>
      <td>${r.confidence}%</td>
    </tr>`).join('');
  } catch (e) {}
}

// ---- Tabs / Modals ----
function switchTab(tab, panelId) {
  tab.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(panelId).classList.add('active');
  if (panelId === 'panel-individual') renderViewData();
}
function openModal(id) { document.getElementById('modal-' + id).classList.add('open'); }
function closeModal(id) { document.getElementById('modal-' + id).classList.remove('open'); }
document.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open'); });

// ---- Toast ----
let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  if (API.getToken()) enterApp();
});
