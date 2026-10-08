// Calls to our own Express API (/api/...). In development Vite proxies these to port 3000.

const CLIENT_ID_KEY = 'hdb-client-id';
let memoryClientId;

// Anonymous id that owns this browser's shortlist until login is added.
export function clientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    memoryClientId ??= crypto.randomUUID();
    return memoryClientId;
  }
}

async function request(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }
  const res = await fetch(url, {
    method,
    headers: {
      'X-Client-Id': clientId(),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error ?? `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  meta: () => request('/meta'),
  searchBlocks: (query) => request('/blocks', { query }),
  getBlock: (id) => request(`/blocks/${encodeURIComponent(id)}`),
  priceTrend: (town, flatType) => request('/analysis/price-trend', { query: { town, flatType } }),
  leaseDecay: () => request('/analysis/lease-decay'),
  shortlist: {
    list: () => request('/shortlist'),
    add: (blockId, flatType, note = '') => request('/shortlist', { method: 'POST', body: { blockId, flatType, note } }),
    update: (id, note) => request(`/shortlist/${id}`, { method: 'PATCH', body: { note } }),
    remove: (id) => request(`/shortlist/${id}`, { method: 'DELETE' }),
  },
};
