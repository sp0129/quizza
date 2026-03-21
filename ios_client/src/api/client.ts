import * as SecureStore from 'expo-secure-store';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

// Token held in memory; populated by AuthProvider on startup
let _token: string | null = null;
let _onAuthExpired: (() => void) | null = null;
let _authExpiredFired = false;

export function setAuthToken(token: string | null) {
  _token = token;
  if (token) _authExpiredFired = false;
}

export function getAuthToken(): string | null {
  return _token;
}

/** Register a callback for when the server rejects our token (401). */
export function onAuthExpired(cb: () => void) {
  _onAuthExpired = cb;
}

const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
  const data = await res.json();
  if (!res.ok) {
    // Token rejected — clear stored credentials and force re-login
    // Only fire once to avoid spamming multiple overlays from parallel requests
    if (res.status === 401 && _token && !_authExpiredFired) {
      _authExpiredFired = true;
      _token = null;
      SecureStore.deleteItemAsync('token').catch(() => {});
      SecureStore.deleteItemAsync('user').catch(() => {});
      _onAuthExpired?.();
    }
    const err = new Error(data.error ?? 'Request failed') as any;
    if (data.code) err.code = data.code;
    if (data.email) err.email = data.email;
    throw err;
  }
  return data as T;
}

export const api = {
  get:    <T>(path: string) => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
