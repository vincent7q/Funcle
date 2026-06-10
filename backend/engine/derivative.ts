import type { Coefficients, IsIncResult } from '../../shared/types';
import { evaluate } from './polynomial';

/**
 * Derivative logic for the `is_inc` command (spec §4.3, §13 Q3). Pure, no I/O.
 * Coefficients are highest-degree first.
 */

/** Slopes within this magnitude of zero count as stationary (guards fp noise). */
const EPSILON = 1e-9;

/**
 * Compute the coefficients of f'(x) from f(x), highest-degree first.
 * e.g. [1,0,-4] (x²−4) -> [2,0] (2x). A constant returns [0].
 */
export function derivativeCoeffs(coeffs: Coefficients): Coefficients {
  const degree = coeffs.length - 1;
  if (degree < 1) return [0];
  // Term i (highest-first) has power (degree - i); its derivative is coeff*(power).
  return coeffs.slice(0, degree).map((c, i) => c * (degree - i));
}

/**
 * Direction of f at x: 'Increasing' if f'(x) > 0, 'Decreasing' if f'(x) < 0,
 * 'Stationary' if f'(x) = 0 (spec §13 Q3).
 */
export function evaluateDirection(coeffs: Coefficients, x: number): IsIncResult {
  const slope = evaluate(derivativeCoeffs(coeffs), x);
  if (slope > EPSILON) return 'Increasing';
  if (slope < -EPSILON) return 'Decreasing';
  return 'Stationary';
}
