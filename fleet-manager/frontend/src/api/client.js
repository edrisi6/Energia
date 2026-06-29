// ─────────────────────────────────────────────────────────────
// A tiny fetch wrapper for talking to the backend API.
// - Automatically attaches the saved JWT token to every request.
// - Parses JSON and throws a friendly Error on failure.
// In dev, requests go to /api which Vite proxies to the backend (port 4000).
// ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'fleet_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Try to parse JSON; some endpoints may return empty bodies.
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    // If a previously-valid session has expired (401 while we held a token),
    // clear it and send the user back to the login screen.
    if (res.status === 401 && token) {
      setToken(null);
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    const message = (data && data.error) || `Request failed (${res.status}).`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
};
