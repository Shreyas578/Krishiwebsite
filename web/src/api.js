const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getToken() {
  return localStorage.getItem('kisan_access_token');
}

export function setSession(data) {
  const token = data?.accessToken || data?.access_token || data?.token;
  if (token) localStorage.setItem('kisan_access_token', token);
  if (data?.user) localStorage.setItem('kisan_user', JSON.stringify(data.user));
}

export function clearSession() {
  localStorage.removeItem('kisan_access_token');
  localStorage.removeItem('kisan_user');
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('kisan_user') || 'null'); } catch { return null; }
}

export async function api(path, options = {}) {
  const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('Unable to reach the Kisan AI server. Start the backend with "cd backend; npm start" and make sure it is running on port 3000.');
  }
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
  if (!response.ok) throw new Error(payload.error || payload.message || `Request failed (${response.status})`);
  return payload;
}

export async function login(phone, password) {
  const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) });
  setSession(data);
  return data;
}

export async function register(payload) {
  const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  setSession(data);
  return data;
}
