import { describe, it, expect } from 'vitest';
import { evaluatePoly, buildCurve } from './curve';

describe('evaluatePoly', () => {
  it('evaluates x^2 - 4', () => {
    expect(evaluatePoly([1, 0, -4], 0)).toBe(-4);
    expect(evaluatePoly([1, 0, -4], 3)).toBe(5);
  });
});

describe('buildCurve', () => {
  it('produces a dense line whose points lie on f(x)', () => {
    const { line } = buildCurve([1, 0, -4], [], 10);
    expect(line.length).toBe(11);
    for (const p of line) {
      expect(p.y).toBeCloseTo(evaluatePoly([1, 0, -4], p.x), 9);
    }
  });

  it('passes through the discovered points and widens the range to include them', () => {
    const discovered = [{ x: 8, y: 60 }];
    const { line, points } = buildCurve([1, 0, -4], discovered, 20);
    expect(points).toEqual(discovered);
    // Range should extend past x = 8 (since a discovered point sits there).
    expect(Math.max(...line.map((p) => p.x))).toBeGreaterThanOrEqual(8);
  });
});
