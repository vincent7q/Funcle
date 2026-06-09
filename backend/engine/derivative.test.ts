import { describe, it, expect } from 'vitest';
import { derivativeCoeffs, evaluateDirection } from './derivative';

describe('derivativeCoeffs', () => {
  it('differentiates x^2 - 4 -> 2x', () => {
    expect(derivativeCoeffs([1, 0, -4])).toEqual([2, 0]);
  });

  it('differentiates a linear 2x - 1 -> constant 2', () => {
    expect(derivativeCoeffs([2, -1])).toEqual([2]);
  });

  it('differentiates a cubic x^3 -> 3x^2', () => {
    expect(derivativeCoeffs([1, 0, 0, 0])).toEqual([3, 0, 0]);
  });

  it('differentiates a general cubic 2x^3 - 3x^2 + 4x - 5 -> 6x^2 - 6x + 4', () => {
    expect(derivativeCoeffs([2, -3, 4, -5])).toEqual([6, -6, 4]);
  });
});

describe('evaluateDirection', () => {
  it('reports Increasing / Decreasing / Stationary for x^2 - 4 (derivative 2x)', () => {
    expect(evaluateDirection([1, 0, -4], 3)).toBe('Increasing');
    expect(evaluateDirection([1, 0, -4], -3)).toBe('Decreasing');
    expect(evaluateDirection([1, 0, -4], 0)).toBe('Stationary'); // §13 Q3
  });

  it('reports Stationary at x=0 for x^3 (derivative 3x^2) and Increasing on both sides', () => {
    expect(evaluateDirection([1, 0, 0, 0], 0)).toBe('Stationary');
    expect(evaluateDirection([1, 0, 0, 0], 2)).toBe('Increasing');
    expect(evaluateDirection([1, 0, 0, 0], -2)).toBe('Increasing');
  });

  it('handles a constant-slope linear function', () => {
    expect(evaluateDirection([2, -1], 99)).toBe('Increasing'); // f' = 2
    expect(evaluateDirection([-3, 1], -99)).toBe('Decreasing'); // f' = -3
  });

  it('works at non-integer x', () => {
    expect(evaluateDirection([1, 0, -4], 0.5)).toBe('Increasing'); // f'(0.5) = 1
    expect(evaluateDirection([1, 0, -4], -0.5)).toBe('Decreasing'); // f'(-0.5) = -1
  });
});
