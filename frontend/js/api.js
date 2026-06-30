// ============================================================
//  SmartAttendance — API Client
// ============================================================
const API = (() => {
  const BASE = '';

  function getToken()  { return localStorage.getItem('sa_token'); }
  function setToken(t) { localStorage.setItem('sa_token', t); }
  function getRole()   { return localStorage.getItem('sa_role'); }
  function setRole(r)  { localStorage.setItem('sa_role', r); }
  function getUser()   { try { return JSON.parse(localStorage.getItem('sa_user')); } catch { return null; } }
  function setUser(u)  { localStorage.setItem('sa_user', JSON.stringify(u)); }
  function clearAll()  { localStorage.removeItem('sa_token'); localStorage.removeItem('sa_role'); localStorage.removeItem('sa_user'); }

  async function request(method, path, body = null, isForm = false) {
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body && !isForm) headers['Content-Type'] = 'application/json';

    const res = await fetch(BASE + path, {
      method, headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });

    if (res.status === 204) return null;
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error((data && data.detail) || 'Request failed');
    return data;
  }

  return {
    getToken, setToken, getRole, setRole, getUser, setUser, clearAll,

    auth: {
      async loginInstructor(email, password) {
        const form = new URLSearchParams({ username: email, password });
        const data = await request('POST', '/api/auth/instructor/login', form, true);
        setToken(data.access_token); setRole('instructor'); setUser(data.user);
        return data;
      },
      async registerInstructor(name, email, password) {
        const data = await request('POST', '/api/auth/instructor/register', { name, email, password });
        setToken(data.access_token); setRole('instructor'); setUser(data.user);
        return data;
      },
      async loginStudent(email, password) {
        const form = new URLSearchParams({ username: email, password });
        const data = await request('POST', '/api/auth/student/login', form, true);
        setToken(data.access_token); setRole('student'); setUser(data.user);
        return data;
      },
      async registerStudent(payload) {
        const data = await request('POST', '/api/auth/student/register', payload);
        setToken(data.access_token); setRole('student'); setUser(data.user);
        return data;
      },
      forgotPassword: (email, role) => request('POST', '/api/auth/forgot-password', { email, role }),
      resetPassword:  (token, role, new_password) => request('POST', '/api/auth/reset-password', { token, role, new_password }),
      logout() { clearAll(); },
    },

    classes: {
      list:     () => request('GET', '/api/classes/'),
      create:   (data) => request('POST', '/api/classes/', data),
      delete:   (id) => request('DELETE', `/api/classes/${id}`),
      toggleVerification: (session_id, open) => request('POST', '/api/classes/sessions/toggle-verification', { session_id, open }),
      join:        (code) => request('POST', '/api/classes/join', { code }),
      myClasses:   () => request('GET', '/api/classes/my-classes'),
    },

    students: {
      list: (classId) => request('GET', '/api/students/' + (classId ? `?class_id=${classId}` : '')),
      uploadPhoto: (image_base64) => request('POST', '/api/students/me/photo', { image_base64 }),
      getPhoto:    () => request('GET', '/api/students/me/photo'),
    },

    samples: {
      unlabeled: () => request('GET', '/api/samples/unlabeled'),
      label: (sample_ids, enrollment_id) => request('POST', '/api/samples/label', { sample_ids, enrollment_id }),
      upload: (enrollment_id, variety, count) => request('POST', '/api/samples/upload', { enrollment_id, variety, count }),
      exportUrl: (format, classId, labeledOnly) => {
        let url = `/api/samples/export?format=${format}&labeled_only=${labeledOnly}`;
        if (classId) url += `&class_id=${classId}`;
        return url;
      },
    },

    attendance: {
      verify: (session_id, enrollment_id, captured_image_base64) =>
        request('POST', '/api/attendance/verify', { session_id, enrollment_id, captured_image_base64 }),
      myRecords: () => request('GET', '/api/attendance/my-records'),
      classRecords: (classId) => request('GET', `/api/attendance/class/${classId}`),
    },
  };
})();
