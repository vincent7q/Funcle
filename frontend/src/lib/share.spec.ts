import { describe, it, expect } from 'vitest';
import { buildShareText } from './share';
import type { GridRow } from '@/components/game/rowState';

const rows: GridRow[] = [
  { state: 'val', label: 'VAL 0', result: '-4' },
  { state: 'val', label: 'VAL 3', result: '5' },
  { state: 'inc', label: 'IS_INC 1', result: 'Increasing' },
  { state: 'inc', label: 'IS_INC -1', result: 'Decreasing' },
  { state: 'target-win', label: 'TARGET', result: '🎯' },
];

describe('buildShareText', () => {
  it('matches the §6 format for a daily win', () => {
    const text = buildShareText({
      mode: 'daily',
      puzzleNumber: 42,
      status: 'won',
      turnsUsed: 5,
      rows,
    });
    expect(text).toBe(
      ['Funcle - Daily #42 — 5/6', '', '🟩 val', '🟩 val', '🟨 is_inc', '🟨 is_inc', '🎯 target ✅'].join(
        '\n',
      ),
    );
  });

  it('shows "Free Play" and X/6 with ❌ on a free-play loss', () => {
    const text = buildShareText({
      mode: 'freeplay',
      puzzleNumber: null,
      status: 'lost',
      turnsUsed: 6,
      rows: [...rows.slice(0, 4), { state: 'target-fail', label: 'TARGET', result: '✗' }],
    });
    expect(text.startsWith('Funcle - Free Play — X/6')).toBe(true);
    expect(text).toContain('🎯 target ❌');
  });

  it('never leaks x-values or results', () => {
    const text = buildShareText({ mode: 'daily', puzzleNumber: 1, status: 'won', turnsUsed: 5, rows });
    expect(text).not.toContain('-4');
    expect(text).not.toContain('Increasing');
  });
});
