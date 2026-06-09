import { parse, type MathNode } from 'mathjs';
import type { Coefficients } from '../../shared/types';
import { evaluate as evaluatePolynomial } from './polynomial';

/**
 * Safe expression parsing + sampling-based equivalence for the `target`
 * command (spec §4.3, §13 Q5). Pure, no I/O.
 *
 * SECURITY (spec §4.3): the player's expression is parsed into an AST and
 * validated to contain ONLY the variable `x`, numeric constants, and the
 * arithmetic operators below. Anything else — other symbols (pi, e, another
 * variable), function calls, assignments — is rejected. We never call
 * `math.evaluate` on the raw string; we only evaluate the *validated* AST.
 */

/** Thrown when an expression is unparseable or uses disallowed constructs. */
export class InvalidExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidExpressionError';
  }
}

const ALLOWED_OPERATORS = new Set(['+', '-', '*', '/', '^']);

/**
 * Distinct sample points (mix of integers and non-integers, both signs). Two
 * differing polynomials of degree d agree at ≤ d points, so this many distinct
 * points reliably separates any plausible guess from the secret while the
 * non-integers stop a wrong guess from coinciding only at integers.
 */
const SAMPLE_POINTS = [-3.5, -2, -1.25, -0.5, 0.5, 1, 1.5, 2.75, 3];

/** Tolerance for floating-point comparison, scaled by magnitude. */
function withinTolerance(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * (1 + Math.abs(b));
}

/** Validate that the AST uses only `x`, constants, and allowed operators. */
function validate(node: MathNode): void {
  node.traverse((n: MathNode) => {
    switch (n.type) {
      case 'ConstantNode':
      case 'ParenthesisNode':
        return;
      case 'SymbolNode': {
        const name = (n as MathNode & { name: string }).name;
        if (name !== 'x') {
          throw new InvalidExpressionError(`Unknown symbol '${name}' (only 'x' is allowed)`);
        }
        return;
      }
      case 'OperatorNode': {
        const op = (n as MathNode & { op: string }).op;
        if (!ALLOWED_OPERATORS.has(op)) {
          throw new InvalidExpressionError(`Operator '${op}' is not allowed`);
        }
        return;
      }
      default:
        throw new InvalidExpressionError(`Disallowed expression element: ${n.type}`);
    }
  });
}

/**
 * Parse + validate an expression and return a numeric evaluator `f(x)`.
 * Throws {@link InvalidExpressionError} for unparseable or disallowed input.
 */
export function compileSafe(expr: string): (x: number) => number {
  let node: MathNode;
  try {
    node = parse(expr);
  } catch {
    throw new InvalidExpressionError('Could not parse expression');
  }
  validate(node);
  const compiled = node.compile();
  return (x: number): number => {
    const value = compiled.evaluate({ x });
    if (typeof value !== 'number') {
      throw new InvalidExpressionError('Expression did not evaluate to a single number');
    }
    return value;
  };
}

/**
 * Decide whether a guess expression is equivalent to the secret polynomial by
 * evaluating both at several distinct points and accepting only if all agree
 * within tolerance (§13 Q5). Invalid/malicious input is treated as a non-match
 * (returns false) rather than throwing, so callers can route it as a wrong guess.
 */
/** Result of parsing an admin-authored expression into a validated secret. */
export type ParsedPolynomial =
  | { ok: true; coeffs: Coefficients }
  | { ok: false; reason: string };

/** Round to the nearest integer if within tolerance, else null. */
function nearestInt(value: number): number | null {
  const rounded = Math.round(value);
  return Math.abs(value - rounded) <= 1e-6 ? rounded : null;
}

/**
 * Parse an admin-authored expression into integer coefficients and validate it
 * against the confirmed §13 rules (degree 1–3, integer coeffs −10..10). Used by
 * the admin puzzle CRUD (§3.3). Returns a reason string on rejection.
 *
 * Approach: the safe evaluator is sampled at x = 0..3 and fit (finite
 * differences) to a cubic, then the fit is verified against the expression at
 * extra points — so non-polynomial or degree>3 input is rejected.
 */
export function parsePolynomialExpression(expr: string): ParsedPolynomial {
  let f: (x: number) => number;
  try {
    f = compileSafe(expr);
  } catch {
    return { ok: false, reason: 'not a valid expression of x' };
  }

  const samples = [0, 1, 2, 3].map(f);
  if (samples.some((y) => !Number.isFinite(y))) {
    return { ok: false, reason: 'not a polynomial' };
  }
  const [y0, y1, y2, y3] = samples as [number, number, number, number];
  const d1 = y1 - y0;
  const d2 = y2 - 2 * y1 + y0;
  const d3 = y3 - 3 * y2 + 3 * y1 - y0;

  const a3 = nearestInt(d3 / 6);
  const a2 = nearestInt(d2 / 2 - d3 / 2);
  const a1 = nearestInt(d1 - d2 / 2 + d3 / 3);
  const a0 = nearestInt(y0);
  if (a3 === null || a2 === null || a1 === null || a0 === null) {
    return { ok: false, reason: 'coefficients must be integers' };
  }

  let coeffs: number[] = [a3, a2, a1, a0];
  // Verify the integer cubic actually matches the expression (catches degree>3,
  // rational functions, etc.) at points outside the fitting set.
  for (const x of [-1, 4, 0.5, -2.5]) {
    if (Math.abs(evaluatePolynomial(coeffs, x) - f(x)) > 1e-6) {
      return { ok: false, reason: 'must be a polynomial of degree 1–3' };
    }
  }

  while (coeffs.length > 1 && coeffs[0] === 0) coeffs = coeffs.slice(1);
  const degree = coeffs.length - 1;
  if (degree < 1 || degree > 3) {
    return { ok: false, reason: 'degree must be between 1 and 3' };
  }
  if (coeffs.some((c) => c < -10 || c > 10)) {
    return { ok: false, reason: 'coefficients must be between -10 and 10' };
  }
  return { ok: true, coeffs };
}

export function isEquivalent(guessExpr: string, secret: Coefficients): boolean {
  let guess: (x: number) => number;
  try {
    guess = compileSafe(guessExpr);
  } catch {
    return false;
  }
  for (const x of SAMPLE_POINTS) {
    const guessValue = guess(x);
    if (!Number.isFinite(guessValue)) return false;
    if (!withinTolerance(guessValue, evaluatePolynomial(secret, x))) return false;
  }
  return true;
}
