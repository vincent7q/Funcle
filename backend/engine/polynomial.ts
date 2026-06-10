import type { Coefficients } from '../../shared/types';

/**
 * Pure polynomial logic (no I/O). Coefficients are highest-degree first,
 * e.g. [1, 0, -4] = x² − 4 (spec §4.1). Generation obeys the confirmed
 * §13 rules: degree 1–3 (Q1), integer coefficients −10..10 with a non-zero
 * leading coefficient (Q2).
 */

const MIN_DEGREE = 1;
const MAX_DEGREE = 3;
const COEFF_ABS = 10;

/** Evaluate f(x) using Horner's method. coeffs[0] is the highest-degree term. */
export function evaluate(coeffs: Coefficients, x: number): number {
  return coeffs.reduce((acc, c) => acc * x + c, 0);
}

/**
 * Render coefficients (highest-degree first) as a readable polynomial string,
 * e.g. [1,0,-4] -> "x^2 - 4". Used only to reveal the secret at game end (§8).
 */
export function formatPolynomial(coeffs: Coefficients): string {
  const degree = coeffs.length - 1;
  const parts: { negative: boolean; term: string }[] = [];

  coeffs.forEach((c, i) => {
    if (c === 0) return;
    const power = degree - i;
    const abs = Math.abs(c);
    let term: string;
    if (power === 0) {
      term = String(abs);
    } else {
      const coeffPart = abs === 1 ? '' : String(abs);
      term = coeffPart + (power === 1 ? 'x' : `x^${power}`);
    }
    parts.push({ negative: c < 0, term });
  });

  if (parts.length === 0) return '0';

  return parts
    .map((p, i) => {
      if (i === 0) return (p.negative ? '-' : '') + p.term;
      return (p.negative ? ' - ' : ' + ') + p.term;
    })
    .join('');
}

/** A function returning a float in [0, 1) — `Math.random` or a seeded PRNG. */
type Rng = () => number;

/** Integer in [-COEFF_ABS, COEFF_ABS] (inclusive). */
function randCoeff(rng: Rng): number {
  return Math.floor(rng() * (2 * COEFF_ABS + 1)) - COEFF_ABS;
}

/** Non-zero integer in [-COEFF_ABS, COEFF_ABS] — for the leading coefficient. */
function randLeading(rng: Rng): number {
  // Pick from the 2*COEFF_ABS non-zero values, mapping the zero gap out.
  const v = Math.floor(rng() * (2 * COEFF_ABS)); // 0 .. 2*COEFF_ABS-1
  return v < COEFF_ABS ? v - COEFF_ABS : v - COEFF_ABS + 1; // -COEFF_ABS..-1 , 1..COEFF_ABS
}

/** Generate a secret polynomial using the supplied RNG. */
function generate(rng: Rng): Coefficients {
  const degree = MIN_DEGREE + Math.floor(rng() * (MAX_DEGREE - MIN_DEGREE + 1));
  const coeffs: number[] = [randLeading(rng)];
  for (let i = 0; i < degree; i++) {
    coeffs.push(randCoeff(rng));
  }
  return coeffs;
}

/** Generate a random secret polynomial (Free Play, spec §3.2). */
export function generateRandom(): Coefficients {
  return generate(Math.random);
}

/**
 * Deterministically generate a secret polynomial from a calendar date, so all
 * players get the same Daily puzzle for a given date (spec §3.1, §3.3 fallback).
 * Accepts an ISO date string ('YYYY-MM-DD') or a Date (reduced to its UTC day).
 */
export function generateFromDate(date: string | Date): Coefficients {
  const key = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  return generate(mulberry32(hashString(key)));
}

/** Deterministic 32-bit string hash (cyrb53-lite) used to seed the PRNG. */
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32: a small, fast, deterministic PRNG seeded by a 32-bit integer. */
function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
