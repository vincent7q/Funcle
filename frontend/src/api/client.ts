import type {
  NewSessionResponse,
  DailyResponse,
  ValResponse,
  IsIncResponse,
  TargetResponse,
} from '@shared/types';

/**
 * Typed `fetch` wrapper for the Funcle backend (spec §8). In dev, Vite proxies
 * `/api` to the backend (see vite.config.ts); in single-origin prod the API is
 * served from the same origin, so a relative base works in both.
 */
const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  newSession: (userId: string | null) =>
    request<NewSessionResponse>('/session/new', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  getDaily: (userId?: string) =>
    request<DailyResponse>(`/daily${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`),

  val: (sessionId: string, x: number) =>
    request<ValResponse>('/game/val', { method: 'POST', body: JSON.stringify({ sessionId, x }) }),

  isInc: (sessionId: string, x: number) =>
    request<IsIncResponse>('/game/is_inc', {
      method: 'POST',
      body: JSON.stringify({ sessionId, x }),
    }),

  target: (sessionId: string, expression: string) =>
    request<TargetResponse>('/game/target', {
      method: 'POST',
      body: JSON.stringify({ sessionId, expression }),
    }),
};
