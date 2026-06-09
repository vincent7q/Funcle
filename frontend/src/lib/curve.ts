import type { Coefficients } from '@shared/types';

export interface Point {
  x: number;
  y: number;
}

export interface CurveData {
  /** Dense sample points for the f(x) line. */
  line: Point[];
  /** The player's discovered `val` points to mark on the curve. */
  points: Point[];
}

/** Evaluate f(x) (coefficients highest-degree first) via Horner's method. */
export function evaluatePoly(coeffs: Coefficients, x: number): number {
  return coeffs.reduce((acc, c) => acc * x + c, 0);
}

/**
 * Build the data for the end-game chart (§7.4): a dense f(x) line over an
 * x-range centered on the player's discovered points (padded), plus those
 * points to mark. Pure — unit-tested without touching a canvas.
 */
export function buildCurve(
  coeffs: Coefficients,
  discovered: Point[],
  steps = 80,
): CurveData {
  const xs = discovered.map((p) => p.x);
  const lo = Math.floor(Math.min(-5, ...xs) - 1);
  const hi = Math.ceil(Math.max(5, ...xs) + 1);
  const line: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = lo + ((hi - lo) * i) / steps;
    line.push({ x, y: evaluatePoly(coeffs, x) });
  }
  return { line, points: discovered };
}
