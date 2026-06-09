import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Coefficients, Command, GameMode, GameStatus, MoveRecord } from '@shared/types';
import { TOTAL_TURNS } from '@shared/types';
import { api } from '@/api/client';
import { getAnonId } from '@/lib/anonId';
import type { GridRow } from '@/components/game/rowState';

type Status = 'idle' | GameStatus;

/** Map a persisted move (e.g. from daily resume) to a display row. */
function moveToRow(move: MoveRecord): GridRow {
  if (move.command === 'val') {
    return { state: 'val', label: `VAL ${move.inputX}`, result: move.result };
  }
  if (move.command === 'is_inc') {
    return { state: 'inc', label: `IS_INC ${move.inputX}`, result: move.result };
  }
  const won = move.result === 'correct';
  return { state: won ? 'target-win' : 'target-fail', label: 'TARGET', result: won ? '🎯' : '✗' };
}

/** Derive game status from a resumed history (the /daily response omits it). */
function deriveStatus(history: MoveRecord[], turnsRemaining: number): GameStatus {
  if (history.some((m) => m.command === 'target' && m.result === 'correct')) return 'won';
  if (turnsRemaining <= 0) return 'lost';
  return 'active';
}

export const useGameStore = defineStore('game', () => {
  const sessionId = ref<string | null>(null);
  const mode = ref<GameMode>('freeplay');
  const history = ref<GridRow[]>([]);
  const turnsRemaining = ref(TOTAL_TURNS);
  const gameStatus = ref<Status>('idle');
  const secret = ref<string | null>(null);
  const secretCoeffs = ref<Coefficients | null>(null);
  const discoveredPoints = ref<{ x: number; y: number }[]>([]);
  const inputError = ref<string | null>(null);
  const loading = ref(false);
  const puzzleNumber = ref<number | null>(null);

  function reset(): void {
    history.value = [];
    discoveredPoints.value = [];
    secret.value = null;
    secretCoeffs.value = null;
    inputError.value = null;
  }

  async function startFreePlay(): Promise<void> {
    loading.value = true;
    try {
      const res = await api.newSession(null);
      reset();
      sessionId.value = res.sessionId;
      mode.value = 'freeplay';
      puzzleNumber.value = null;
      turnsRemaining.value = res.turnsRemaining;
      gameStatus.value = 'active';
    } finally {
      loading.value = false;
    }
  }

  /** Load (or resume) today's daily puzzle, rebuilding the grid from history. */
  async function startDaily(): Promise<void> {
    loading.value = true;
    try {
      const res = await api.getDaily(getAnonId());
      reset();
      sessionId.value = res.sessionId;
      mode.value = 'daily';
      puzzleNumber.value = res.puzzleNumber;
      history.value = res.history.map(moveToRow);
      // Rebuild discovered points from any prior val moves.
      discoveredPoints.value = res.history
        .filter((m) => m.command === 'val' && m.inputX !== null && Number.isFinite(Number(m.result)))
        .map((m) => ({ x: m.inputX as number, y: Number(m.result) }));
      turnsRemaining.value = res.turnsRemaining;
      gameStatus.value = deriveStatus(res.history, res.turnsRemaining);
    } finally {
      loading.value = false;
    }
  }

  async function submitClue(command: Command, value: string): Promise<void> {
    inputError.value = null;
    if (gameStatus.value !== 'active' || !sessionId.value) return;

    if (command === 'target') {
      const expression = value.trim();
      if (!expression) {
        inputError.value = 'Enter an expression to guess.';
        return;
      }
      const res = await api.target(sessionId.value, expression);
      if (res.correct) {
        history.value.push({ state: 'target-win', label: 'TARGET', result: '🎯' });
        gameStatus.value = 'won';
        secret.value = res.secret;
        secretCoeffs.value = res.secretCoeffs;
        turnsRemaining.value = TOTAL_TURNS - res.turnsUsed;
      } else {
        history.value.push({ state: 'target-fail', label: 'TARGET', result: '✗' });
        gameStatus.value = res.gameStatus;
        turnsRemaining.value = res.turnsRemaining;
        if (res.gameStatus === 'lost' && res.secret) {
          secret.value = res.secret;
          if (res.secretCoeffs) secretCoeffs.value = res.secretCoeffs;
        }
      }
      return;
    }

    // val / is_inc
    const x = Number(value);
    if (value.trim() === '' || !Number.isFinite(x)) {
      inputError.value = 'Enter a valid number for x.';
      return;
    }
    const res = command === 'val' ? await api.val(sessionId.value, x) : await api.isInc(sessionId.value, x);
    if (res.result === 'error') {
      inputError.value = 'Invalid input — try again.';
      return;
    }
    if (command === 'val') {
      history.value.push({ state: 'val', label: `VAL ${x}`, result: String(res.result) });
      if (typeof res.result === 'number') discoveredPoints.value.push({ x, y: res.result });
    } else {
      history.value.push({ state: 'inc', label: `IS_INC ${x}`, result: String(res.result) });
    }
    turnsRemaining.value = res.turnsRemaining;
    gameStatus.value = res.gameStatus;
    if (res.gameStatus === 'lost' && res.secret) {
      secret.value = res.secret;
      if (res.secretCoeffs) secretCoeffs.value = res.secretCoeffs;
    }
  }

  return {
    sessionId,
    mode,
    history,
    turnsRemaining,
    gameStatus,
    secret,
    discoveredPoints,
    inputError,
    loading,
    puzzleNumber,
    secretCoeffs,
    startFreePlay,
    startDaily,
    submitClue,
    moveToRow,
  };
});
