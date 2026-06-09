import type {
  NewSessionResponse,
  DailyResponse,
  ValResponse,
  IsIncResponse,
  TargetResponse,
  AuthResponse,
  StatsResponse,
  AdminLoginResponse,
  AdminPuzzleSummary,
} from '@shared/types';

/**
 * Typed `fetch` wrapper for the Funcle backend (spec §8). In dev, Vite proxies
 * `/api` to the backend (see vite.config.ts); in single-origin prod the API is
 * served from the same origin, so a relative base works in both.
 */
const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string>) },
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface AdminPuzzleBody {
  puzzleDate: string;
  expression: string;
  note?: string;
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

  // --- Accounts (§5) ---
  register: (username: string, password: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  stats: (userId: string) => request<StatsResponse>(`/stats/${encodeURIComponent(userId)}`),

  // --- Admin (§3.3) ---
  adminLogin: (password: string) =>
    request<AdminLoginResponse>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  adminListPuzzles: (token: string) =>
    request<AdminPuzzleSummary[]>('/admin/puzzles', { headers: auth(token) }),

  adminCreatePuzzle: (token: string, body: AdminPuzzleBody) =>
    request<{ puzzleDate: string; puzzleNumber: number }>('/admin/puzzles', {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify(body),
    }),

  adminUpdatePuzzle: (token: string, date: string, body: AdminPuzzleBody) =>
    request<{ puzzleDate: string; updated: boolean }>(`/admin/puzzles/${date}`, {
      method: 'PUT',
      headers: auth(token),
      body: JSON.stringify(body),
    }),

  adminDeletePuzzle: (token: string, date: string) =>
    request<{ puzzleDate: string; deleted: boolean }>(`/admin/puzzles/${date}`, {
      method: 'DELETE',
      headers: auth(token),
    }),
};
