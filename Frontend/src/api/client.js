const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');
const API_PREFIX = '/api/v1';
const TOKEN_KEY = 'skillora_token';
const USER_KEY = 'skillora_user';

// ------------------------------------------------------------------
// Token / user storage
// ------------------------------------------------------------------

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
}

// ------------------------------------------------------------------
// Error type
// ------------------------------------------------------------------

export class ApiError extends Error {
  constructor({ status, message, errors }) {
    super(message || 'Request failed');
    this.status = status;
    this.errors = errors || null; // [{field, message}] or null
  }
}

// ------------------------------------------------------------------
// 401 handling — clear token, notify app, redirect to /login
// ------------------------------------------------------------------

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function handleUnauthorized() {
  clearToken();
  // Leave a flag so the Login page can show why the user was redirected.
  try {
    sessionStorage.setItem('skillora_session_expired', '1');
  } catch {
    /* ignore */
  }
  if (onUnauthorized) onUnauthorized();
}

export function consumeSessionExpiredFlag() {
  try {
    const v = sessionStorage.getItem('skillora_session_expired');
    sessionStorage.removeItem('skillora_session_expired');
    return v === '1';
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------
// Core request helper
// ------------------------------------------------------------------

async function request(method, path, { body, formData, isFormDownload } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (formData) {
    payload = formData; // browser sets multipart Content-Type + boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${API_PREFIX}${path}`, {
      method,
      headers,
      body: payload,
    });
  } catch {
    throw new ApiError({ status: 0, message: 'Cannot reach the server. Check your connection and that the API is running.' });
  }

  // 401 → session expired everywhere
  if (res.status === 401 && !path.startsWith('/auth/')) {
    handleUnauthorized();
    throw new ApiError({ status: 401, message: 'Session expired' });
  }
  if (res.status === 401 && path.startsWith('/auth/')) {
    let bodyData = null;
    try {
      bodyData = await res.json();
    } catch {
      /* ignore */
    }
    throw new ApiError({ status: 401, message: bodyData?.message || 'Invalid email or password' });
  }

  // File downloads (resume GET) stream binary
  const isBinary =
    isFormDownload ||
    (res.headers.get('content-type') || '').includes('application/pdf') ||
    (res.headers.get('content-type') || '').includes('application/octet-stream');
  if (isBinary) {
    if (!res.ok) {
      // Error payloads for downloads are JSON despite the request
      try {
        const errBody = await res.json();
        throw new ApiError({ status: res.status, message: errBody.message, errors: errBody.errors });
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError({ status: res.status, message: `Download failed (${res.status})` });
      }
    }
    const blob = await res.blob();
    return { blob, filename: 'resume.pdf' };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    throw new ApiError({
      status: res.status,
      message: data?.message || `Request failed (${res.status})`,
      errors: data?.errors,
    });
  }

  return data; // { success, message?, data?, errors? }
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { body, ...opts }),
  patch: (path, body) => request('PATCH', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  del: (path) => request('DELETE', path),
  upload: (path, formData) => request('POST', path, { formData }),
  download: (path) => request('GET', path, { isFormDownload: true }),
};

export { BASE_URL };
