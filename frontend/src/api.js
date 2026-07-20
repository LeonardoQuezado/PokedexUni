const BASE = '/api';

async function handle(res) {
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // resposta sem corpo JSON, mantém mensagem genérica
    }
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json();
}

export function fetchCreatures(params = {}) {
  const query = new URLSearchParams(params).toString();
  return fetch(`${BASE}/creatures${query ? `?${query}` : ''}`).then(handle);
}

export function fetchCreature(idOrNumber) {
  return fetch(`${BASE}/creatures/${idOrNumber}`).then(handle);
}

export function createCreature(payload) {
  return fetch(`${BASE}/creatures`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handle);
}

export function updateCreature(id, payload) {
  return fetch(`${BASE}/creatures/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handle);
}

export function deleteCreature(id) {
  return fetch(`${BASE}/creatures/${id}`, { method: 'DELETE' }).then(handle);
}

export function uploadCreatureImage(id, file) {
  const formData = new FormData();
  formData.append('image', file);
  return fetch(`${BASE}/creatures/${id}/image`, {
    method: 'POST',
    body: formData,
  }).then(handle);
}
