import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from './gameStore';
import { api } from '@/api/client';

vi.mock('@/api/client', () => ({
  api: {
    newSession: vi.fn(),
    getDaily: vi.fn(),
    val: vi.fn(),
    isInc: vi.fn(),
    target: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

async function startedStore() {
  mockedApi.newSession.mockResolvedValue({ sessionId: 's1', turnsRemaining: 6 });
  const store = useGameStore();
  await store.startFreePlay();
  return store;
}

describe('gameStore', () => {
  it('starts a free-play session', async () => {
    const store = await startedStore();
    expect(store.sessionId).toBe('s1');
    expect(store.mode).toBe('freeplay');
    expect(store.gameStatus).toBe('active');
    expect(store.turnsRemaining).toBe(6);
    expect(store.history).toHaveLength(0);
  });

  it('appends a val row, records a discovered point, and decrements turns', async () => {
    const store = await startedStore();
    mockedApi.val.mockResolvedValue({ result: -4, turnsRemaining: 5, gameStatus: 'active' });
    await store.submitClue('val', '0');
    expect(store.turnsRemaining).toBe(5);
    expect(store.history[0]).toMatchObject({ state: 'val', label: 'VAL 0', result: '-4' });
    expect(store.discoveredPoints).toContainEqual({ x: 0, y: -4 });
  });

  it('appends an is_inc row', async () => {
    const store = await startedStore();
    mockedApi.isInc.mockResolvedValue({
      result: 'Increasing',
      turnsRemaining: 5,
      gameStatus: 'active',
    });
    await store.submitClue('is_inc', '3');
    expect(store.history[0]).toMatchObject({ state: 'inc', label: 'IS_INC 3', result: 'Increasing' });
  });

  it('treats invalid x as an input error: no backend call, no turn consumed', async () => {
    const store = await startedStore();
    await store.submitClue('val', 'abc');
    expect(mockedApi.val).not.toHaveBeenCalled();
    expect(store.turnsRemaining).toBe(6);
    expect(store.inputError).toBeTruthy();
  });

  it('surfaces a backend "error" result without consuming a turn', async () => {
    const store = await startedStore();
    mockedApi.val.mockResolvedValue({ result: 'error', turnsRemaining: 6, gameStatus: 'active' });
    await store.submitClue('val', '1');
    expect(store.turnsRemaining).toBe(6);
    expect(store.history).toHaveLength(0);
    expect(store.inputError).toBeTruthy();
  });

  it('wins on a correct target and reveals the secret', async () => {
    const store = await startedStore();
    mockedApi.target.mockResolvedValue({
      correct: true,
      gameStatus: 'won',
      turnsUsed: 1,
      secret: 'x^2 - 4',
    });
    await store.submitClue('target', '(x-2)(x+2)');
    expect(store.gameStatus).toBe('won');
    expect(store.secret).toBe('x^2 - 4');
    expect(store.history.at(-1)).toMatchObject({ state: 'target-win' });
  });

  it('keeps the secret hidden on a wrong-but-active target', async () => {
    const store = await startedStore();
    mockedApi.target.mockResolvedValue({ correct: false, gameStatus: 'active', turnsRemaining: 5 });
    await store.submitClue('target', 'x^2 - 3');
    expect(store.gameStatus).toBe('active');
    expect(store.secret).toBeNull();
    expect(store.history.at(-1)).toMatchObject({ state: 'target-fail' });
  });

  it('loses and reveals the secret when a wrong target uses the last turn', async () => {
    const store = await startedStore();
    mockedApi.target.mockResolvedValue({
      correct: false,
      gameStatus: 'lost',
      turnsRemaining: 0,
      secret: 'x^2 - 4',
    });
    await store.submitClue('target', 'x + 1');
    expect(store.gameStatus).toBe('lost');
    expect(store.secret).toBe('x^2 - 4');
  });

  it('loads a daily puzzle, mapping prior history to rows', async () => {
    mockedApi.getDaily.mockResolvedValue({
      sessionId: 'd1',
      turnsRemaining: 4,
      puzzleNumber: 42,
      history: [
        { turnNumber: 1, command: 'val', inputX: 0, expression: null, result: '-4' },
        { turnNumber: 2, command: 'is_inc', inputX: 1, expression: null, result: 'Increasing' },
      ],
    });
    const store = useGameStore();
    await store.startDaily();
    expect(mockedApi.getDaily).toHaveBeenCalledWith(expect.any(String)); // anon id
    expect(store.mode).toBe('daily');
    expect(store.sessionId).toBe('d1');
    expect(store.puzzleNumber).toBe(42);
    expect(store.turnsRemaining).toBe(4);
    expect(store.gameStatus).toBe('active');
    expect(store.history).toEqual([
      { state: 'val', label: 'VAL 0', result: '-4' },
      { state: 'inc', label: 'IS_INC 1', result: 'Increasing' },
    ]);
  });

  it('derives a won status when resuming a solved daily', async () => {
    mockedApi.getDaily.mockResolvedValue({
      sessionId: 'd2',
      turnsRemaining: 4,
      puzzleNumber: 43,
      history: [{ turnNumber: 1, command: 'target', inputX: null, expression: 'x^2-4', result: 'correct' }],
    });
    const store = useGameStore();
    await store.startDaily();
    expect(store.gameStatus).toBe('won');
    expect(store.history.at(-1)).toMatchObject({ state: 'target-win' });
  });

  it('derives a lost status when resuming a daily with no turns left and no win', async () => {
    mockedApi.getDaily.mockResolvedValue({
      sessionId: 'd3',
      turnsRemaining: 0,
      puzzleNumber: 44,
      history: [{ turnNumber: 6, command: 'target', inputX: null, expression: 'x', result: 'wrong' }],
    });
    const store = useGameStore();
    await store.startDaily();
    expect(store.gameStatus).toBe('lost');
  });

  it('ignores submissions once the game is over', async () => {
    const store = await startedStore();
    mockedApi.target.mockResolvedValue({
      correct: true,
      gameStatus: 'won',
      turnsUsed: 1,
      secret: 'x',
    });
    await store.submitClue('target', 'x');
    await store.submitClue('val', '1');
    expect(mockedApi.val).not.toHaveBeenCalled();
  });
});
