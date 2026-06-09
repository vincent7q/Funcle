import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Command, GameMode, GameStatus, MoveRecord } from '@shared/types';
import { TOTAL_TURNS } from '@shared/types';
import { api } from '@/api/client';
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

export const useGameStore = defineStore('game', () => {
  const sessionId = ref<string | null>(null);
  const mode = ref<GameMode>('freeplay');
  const history = ref<GridRow[]>([]);
  const turnsRemaining = ref(TOTAL_TURNS);
  const gameStatus = ref<Status>('idle');
  const secret = ref<string | null>(null);
  const discoveredPoints = ref<{ x: number; y: number }[]>([]);
  const inputError = ref<string | null>(null);
  const loading = ref(false);

  function reset(): void {
    history.value = [];
    discoveredPoints.value = [];
    secret.value = null;
    inputError.value = null;
  }

  async function startFreePlay(): Promise<void> {
    loading.value = true;
    try {
      const res = await api.newSession(null);
      reset();
      sessionId.value = res.sessionId;
      mode.value = 'freeplay';
      turnsRemaining.value = res.turnsRemaining;
      gameStatus.value = 'active';
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
        turnsRemaining.value = TOTAL_TURNS - res.turnsUsed;
      } else {
        history.value.push({ state: 'target-fail', label: 'TARGET', result: '✗' });
        gameStatus.value = res.gameStatus;
        turnsRemaining.value = res.turnsRemaining;
        if (res.gameStatus === 'lost' && res.secret) secret.value = res.secret;
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
    if (res.gameStatus === 'lost' && res.secret) secret.value = res.secret;
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
    startFreePlay,
    submitClue,
    moveToRow,
  };
});
