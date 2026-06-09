import { describe, it, expect } from 'vitest';
import type { Coefficients } from '../../shared/types';
import { compileSafe, isEquivalent, InvalidExpressionError } from './parser';

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
