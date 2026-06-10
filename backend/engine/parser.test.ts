import { describe, it, expect } from 'vitest';
import type { Coefficients } from '../../shared/types';
import { compileSafe, isEquivalent, parsePolynomialExpression, InvalidExpressionError } from './parser';

const SECRET: Coefficients = [1, 0, -4]; // x^2 - 4

describe('isEquivalent — accepts equivalent forms (§13 Q5)', () => {
  it('accepts the canonical form x^2 - 4', () => {
    expect(isEquivalent('x^2 - 4', SECRET)).toBe(true);
  });

  it('accepts a reordered form -4 + x^2', () => {
    expect(isEquivalent('-4 + x^2', SECRET)).toBe(true);
  });

  it('accepts a factored form (x-2)(x+2)', () => {
    expect(isEquivalent('(x-2)(x+2)', SECRET)).toBe(true);
  });

  it('accepts x*x - 4 (explicit multiplication)', () => {
    expect(isEquivalent('x*x - 4', SECRET)).toBe(true);
  });
});

describe('isEquivalent — rejects wrong guesses and near-misses', () => {
  it('rejects x^2 - 3', () => {
    expect(isEquivalent('x^2 - 3', SECRET)).toBe(false);
  });

  it('rejects the bare quadratic x^2', () => {
    expect(isEquivalent('x^2', SECRET)).toBe(false);
  });

  it('rejects a linear near-miss 2*x - 4', () => {
    expect(isEquivalent('2*x - 4', SECRET)).toBe(false);
  });

  it('rejects a higher-degree near-miss x^3 - 4', () => {
    expect(isEquivalent('x^3 - 4', SECRET)).toBe(false);
  });
});

describe('compileSafe — security: only x + arithmetic operators', () => {
  it('compiles a valid expression to an evaluator', () => {
    const f = compileSafe('x^2 - 4');
    expect(f(3)).toBe(5);
    expect(f(0)).toBe(-4);
  });

  it('rejects function calls (e.g. sin)', () => {
    expect(() => compileSafe('sin(x)')).toThrow(InvalidExpressionError);
  });

  it('rejects unknown symbols / other variables', () => {
    expect(() => compileSafe('y + 1')).toThrow(InvalidExpressionError);
    expect(() => compileSafe('x + pi')).toThrow(InvalidExpressionError);
  });

  it('rejects assignments and other constructs', () => {
    expect(() => compileSafe('x = 5')).toThrow(InvalidExpressionError);
  });

  it('rejects unparseable garbage', () => {
    expect(() => compileSafe('@@@ not math')).toThrow(InvalidExpressionError);
  });
});

describe('isEquivalent — never throws on malicious/invalid input', () => {
  it('returns false for function calls instead of throwing', () => {
    expect(isEquivalent('sin(x)', SECRET)).toBe(false);
  });

  it('returns false for garbage instead of throwing', () => {
    expect(isEquivalent('@@@', SECRET)).toBe(false);
  });

  it('returns false for other variables', () => {
    expect(isEquivalent('y^2 - 4', SECRET)).toBe(false);
  });
});

describe('parsePolynomialExpression (admin authoring, §13)', () => {
  function coeffs(expr: string) {
    const r = parsePolynomialExpression(expr);
    return r.ok ? r.coeffs : null;
  }

  it('parses canonical, reordered, and factored forms to coefficients', () => {
    expect(coeffs('x^2 - 4')).toEqual([1, 0, -4]);
    expect(coeffs('-4 + x^2')).toEqual([1, 0, -4]);
    expect(coeffs('(x-2)(x+2)')).toEqual([1, 0, -4]);
  });

  it('parses linear and cubic polynomials', () => {
    expect(coeffs('2x - 1')).toEqual([2, -1]);
    expect(coeffs('2x^3 - x')).toEqual([2, 0, -1, 0]);
    expect(coeffs('x')).toEqual([1, 0]);
  });

  it('rejects a constant (degree 0)', () => {
    const r = parsePolynomialExpression('5');
    expect(r.ok).toBe(false);
  });

  it('rejects degree > 3', () => {
    expect(parsePolynomialExpression('x^4').ok).toBe(false);
  });

  it('rejects coefficients out of the -10..10 range', () => {
    expect(parsePolynomialExpression('11x').ok).toBe(false);
  });

  it('rejects non-integer coefficients', () => {
    expect(parsePolynomialExpression('x^2 + 0.5*x').ok).toBe(false);
  });

  it('rejects non-polynomial / unsafe input', () => {
    expect(parsePolynomialExpression('1/x').ok).toBe(false);
    expect(parsePolynomialExpression('sin(x)').ok).toBe(false);
  });

  it('includes a human-readable reason on rejection', () => {
    const r = parsePolynomialExpression('x^4');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(typeof r.reason).toBe('string');
  });
});
