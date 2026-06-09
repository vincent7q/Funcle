import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAdminStore } from './adminStore';
import { api } from '@/api/client';

vi.mock('@/api/client', () => ({
  api: {
    adminLogin: vi.fn(),
    adminListPuzzles: vi.fn(),
    adminCreatePuzzle: vi.fn(),
    adminUpdatePuzzle: vi.fn(),
    adminDeletePuzzle: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

async function loggedIn() {
  mockedApi.adminLogin.mockResolvedValue({ token: 't1' });
  mockedApi.adminListPuzzles.mockResolvedValue([]);
  const store = useAdminStore();
  await store.login('pw');
  return store;
}

describe('adminStore', () => {
  it('logs in, stores the token, and fetches puzzles', async () => {
    const store = await loggedIn();
    expect(store.token).toBe('t1');
    expect(store.isAuthenticated).toBe(true);
    expect(mockedApi.adminListPuzzles).toHaveBeenCalledWith('t1');
  });

  it('records an error and stays logged out on a bad password', async () => {
    mockedApi.adminLogin.mockRejectedValue(new Error('Invalid password'));
    const store = useAdminStore();
    await store.login('bad');
    expect(store.token).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.error).toBeTruthy();
  });

  it('schedules a puzzle then refreshes the list', async () => {
    const store = await loggedIn();
    mockedApi.adminCreatePuzzle.mockResolvedValue({ puzzleDate: '2999-01-01', puzzleNumber: 1 });
    mockedApi.adminListPuzzles.mockResolvedValue([
      { puzzleDate: '2999-01-01', puzzleNumber: 1, expression: 'x^2 - 4', note: null, source: 'curated' },
    ]);
    await store.schedule({ puzzleDate: '2999-01-01', expression: 'x^2 - 4' });
    expect(mockedApi.adminCreatePuzzle).toHaveBeenCalledWith('t1', {
      puzzleDate: '2999-01-01',
      expression: 'x^2 - 4',
    });
    expect(store.puzzles).toHaveLength(1);
    expect(store.formError).toBeNull();
  });

  it('surfaces a scheduling error as formError', async () => {
    const store = await loggedIn();
    mockedApi.adminCreatePuzzle.mockRejectedValue(new Error('A puzzle already exists for that date'));
    await store.schedule({ puzzleDate: '2999-01-01', expression: 'x^2 - 4' });
    expect(store.formError).toContain('already exists');
  });

  it('deletes a puzzle then refreshes', async () => {
    const store = await loggedIn();
    mockedApi.adminDeletePuzzle.mockResolvedValue({ puzzleDate: '2999-01-01', deleted: true });
    mockedApi.adminListPuzzles.mockResolvedValue([]);
    await store.remove('2999-01-01');
    expect(mockedApi.adminDeletePuzzle).toHaveBeenCalledWith('t1', '2999-01-01');
  });
});
