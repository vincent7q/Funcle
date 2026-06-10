import type { GameMode } from '@shared/types';
import type { GridRow } from '@/components/game/rowState';

export interface ShareInput {
  mode: GameMode;
  puzzleNumber: number | null;
  status: 'won' | 'lost';
  turnsUsed: number;
  /** The filled history rows (no x-values or results are shared — spec §6). */
  rows: GridRow[];
}

/** One emoji line per move; never leaks the x-value or result (§6). */
function rowLine(row: GridRow): string {
  switch (row.state) {
    case 'val':
      return '🟩 val';
    case 'inc':
      return '🟨 is_inc';
    case 'target-win':
      return '🎯 target ✅';
    case 'target-fail':
      return '🎯 target ❌';
    default:
      return '';
  }
}

/** Build the Wordle-style share text (spec §6). */
export function buildShareText(input: ShareInput): string {
  const title =
    input.mode === 'daily' && input.puzzleNumber ? `Daily #${input.puzzleNumber}` : 'Free Play';
  const score = input.status === 'won' ? `${input.turnsUsed}/6` : 'X/6';
  const header = `Funcle - ${title} — ${score}`;
  const lines = input.rows.map(rowLine).filter((l) => l !== '');
  return [header, '', ...lines].join('\n');
}
