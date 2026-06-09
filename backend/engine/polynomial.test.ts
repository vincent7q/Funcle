import { describe, it, expect } from 'vitest';
import type { Coefficients } from '../../shared/types';
import { evaluate, generateRandom, generateFromDate } from './polynomial';

/** Asserts a generated polynomial obeys the §13 rules (Q1 degree 1-3, Q2 coeffs -10..10). */
function expectValidSecret(coeffs: Coefficients): void {
  expect(coeffs.length).toBeGreaterThanOrEqual(2); // degree >= 1
  expect(coeffs.length).toBeLessThanOrEqual(4); // degree <= 3
  expect(coeffs[0]).not.toBe(0); // leading coefficient non-zero
  for (const c of coeffs) {
    expect(Number.isInteger(c)).toBe(true);
    expect(c).toBeGreaterThanOrEqual(-10);
    expect(c).toBeLessThanOrEqual(10);
  }
}

describe('evaluate', () => {
  it('evaluates x^2 - 4 ([1,0,-4]) at integer points', () => {
    const f: Coefficients = [1, 0, -4];
    expect(evaluate(f, 0)).toBe(-4);
    expect(evaluate(f, 3)).toBe(5);
    expect(evaluate(f, -2)).toBe(0);
  });

  it('evaluates at non-integer x', () => {
    expect(evaluate([1, 0, -4], 0.5)).toBeCloseTo(-3.75, 10);
  });

  it('evaluates a linear polynomial 2x - 1 ([2,-1])', () => {
    expect(evaluate([2, -1], 3)).toBe(5);
  });

  it('evaluates a cubic x^3 ([1,0,0,0])', () => {
    expect(evaluate([1, 0, 0, 0], 2)).toBe(8);
    expect(evaluate([1, 0, 0, 0], -2)).toBe(-8);
  });
});

describe('generateRandom', () => {
  it('always produces a valid secret within the §13 bounds', () => {
    for (let i = 0; i < 1000; i++) {
      expectValidSecret(generateRandom());
    }
  });

  it('produces a spread of degrees over many runs (1, 2, and 3 all appear)', () => {
    const degrees = new Set<number>();
    for (let i = 0; i < 500; i++) {
      degrees.add(generateRandom().length - 1);
    }
    expect(degrees).toEqual(new Set([1, 2, 3]));
  });
});

describe('generateFromDate', () => {
  it('is deterministic — same date string yields identical coefficients', () => {
    expect(generateFromDate('2026-06-10')).toEqual(generateFromDate('2026-06-10'));
  });

  it('treats a Date and its ISO date string as the same day', () => {
    const fromString = generateFromDate('2026-06-10');
    const fromDate = generateFromDate(new Date('2026-06-10T15:30:00Z'));
    expect(fromDate).toEqual(fromString);
  });

  it('produces valid secrets for arbitrary dates', () => {
    for (const d of ['2026-01-01', '2026-06-10', '2027-12-31', '2025-02-28']) {
      expectValidSecret(generateFromDate(d));
    }
  });

  it('different dates generally yield different puzzles', () => {
    const a = generateFromDate('2026-06-10');
    const b = generateFromDate('2026-06-11');
    expect(a).not.toEqual(b);
  });
});
