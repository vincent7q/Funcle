import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from './authStore';
import { api } from '@/api/client';

vi.mock('@/api/client', () => ({
  api: { register: vi.fn(), login: vi.fn() },
}));

const mockedApi = vi.mocked(api);

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('authStore', () => {
  it('falls back to the anonymous id when logged out', () => {
    const store = useAuthStore();
    expect(store.isLoggedIn).toBe(false);
    expect(typeof store.currentUserId).toBe('string');
    expect(store.currentUserId.length).toBeGreaterThan(0);
  });

  it('registers, stores the user, and uses the account id', async () => {
    mockedApi.register.mockResolvedValue({ userId: 'u1', username: 'alice' });
    const store = useAuthStore();
    const ok = await store.register('alice', 'hunter2!');
    expect(ok).toBe(true);
    expect(store.isLoggedIn).toBe(true);
    expect(store.username).toBe('alice');
    expect(store.currentUserId).toBe('u1');
    expect(localStorage.getItem('funcle_user')).toContain('u1');
  });

  it('logs in and persists across a fresh store', async () => {
    mockedApi.login.mockResolvedValue({ userId: 'u2', username: 'bob' });
    await useAuthStore().login('bob', 'pass1234');
    setActivePinia(createPinia());
    expect(useAuthStore().currentUserId).toBe('u2');
  });

  it('records an error and stays logged out on failure', async () => {
    mockedApi.login.mockRejectedValue(new Error('Invalid username or password'));
    const store = useAuthStore();
    const ok = await store.login('bob', 'wrong');
    expect(ok).toBe(false);
    expect(store.isLoggedIn).toBe(false);
    expect(store.error).toContain('Invalid');
  });

  it('logs out and clears storage', async () => {
    mockedApi.login.mockResolvedValue({ userId: 'u3', username: 'carol' });
    const store = useAuthStore();
    await store.login('carol', 'pass1234');
    store.logout();
    expect(store.isLoggedIn).toBe(false);
    expect(localStorage.getItem('funcle_user')).toBeNull();
  });
});
