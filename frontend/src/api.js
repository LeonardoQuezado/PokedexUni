const BASE = '/api';

async function handle(res) {
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    let extra = {};
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
      extra = body || {};
    } catch {
      // resposta sem corpo JSON, mantém mensagem genérica
    }
    const err = new Error(message);
    Object.assign(err, extra);
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

function getJson(url) {
  return fetch(url, { credentials: 'include' }).then(handle);
}

function sendJson(url, method, payload) {
  return fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handle);
}

export function fetchCreatures(params = {}) {
  const query = new URLSearchParams(params).toString();
  return getJson(`${BASE}/creatures${query ? `?${query}` : ''}`);
}

export function fetchCreature(idOrNumber) {
  return getJson(`${BASE}/creatures/${idOrNumber}`);
}

export function createCreature(payload) {
  return sendJson(`${BASE}/creatures`, 'POST', payload);
}

export function updateCreature(id, payload) {
  return sendJson(`${BASE}/creatures/${id}`, 'PUT', payload);
}

export function deleteCreature(id) {
  return fetch(`${BASE}/creatures/${id}`, { method: 'DELETE', credentials: 'include' }).then(handle);
}

export function uploadCreatureImage(id, file) {
  const formData = new FormData();
  formData.append('image', file);
  return fetch(`${BASE}/creatures/${id}/image`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  }).then(handle);
}

export function registerUser(payload) {
  return sendJson(`${BASE}/auth/register`, 'POST', payload);
}

export function verifyEmail(token) {
  return sendJson(`${BASE}/auth/verify`, 'POST', { token });
}

export function resendVerification(identifier) {
  return sendJson(`${BASE}/auth/resend-verification`, 'POST', { identifier });
}

export function loginUser(payload) {
  return sendJson(`${BASE}/auth/login`, 'POST', payload);
}

export function logoutUser() {
  return fetch(`${BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).then(handle);
}

export function fetchMe() {
  return getJson(`${BASE}/auth/me`);
}

export function uploadUserPhoto(file) {
  const formData = new FormData();
  formData.append('photo', file);
  return fetch(`${BASE}/users/me/photo`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  }).then(handle);
}
