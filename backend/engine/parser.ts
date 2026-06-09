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
