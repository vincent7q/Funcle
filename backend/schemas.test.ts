import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  newSessionRequestSchema,
  valRequestSchema,
  isIncRequestSchema,
  targetRequestSchema,
  adminLoginRequestSchema,
  adminPuzzleRequestSchema,
} from '../shared/schemas';

const uuid = randomUUID();

describe('newSessionRequestSchema', () => {
  it('accepts an explicit userId', () => {
    expect(newSessionRequestSchema.safeParse({ userId: 'user-1' }).success).toBe(true);
  });

  it('accepts a null userId (anonymous)', () => {
    expect(newSessionRequestSchema.safeParse({ userId: null }).success).toBe(true);
  });

  it('rejects a numeric userId', () => {
    expect(newSessionRequestSchema.safeParse({ userId: 42 }).success).toBe(false);
  });
});

describe('valRequestSchema / isIncRequestSchema', () => {
  it('accepts a uuid sessionId and a decimal x', () => {
    expect(valRequestSchema.safeParse({ sessionId: uuid, x: 1.5 }).success).toBe(true);
    expect(isIncRequestSchema.safeParse({ sessionId: uuid, x: -3 }).success).toBe(true);
  });

  it('rejects a non-uuid sessionId', () => {
    expect(valRequestSchema.safeParse({ sessionId: 'nope', x: 1 }).success).toBe(false);
  });

  it('rejects a non-numeric x', () => {
    expect(valRequestSchema.safeParse({ sessionId: uuid, x: '1' }).success).toBe(false);
  });

  it('rejects a non-finite x (NaN/Infinity)', () => {
    expect(valRequestSchema.safeParse({ sessionId: uuid, x: Infinity }).success).toBe(false);
  });

  it('rejects a missing x', () => {
    expect(valRequestSchema.safeParse({ sessionId: uuid }).success).toBe(false);
  });
});

describe('targetRequestSchema', () => {
  it('accepts a sessionId and a non-empty expression', () => {
    expect(targetRequestSchema.safeParse({ sessionId: uuid, expression: 'x^2 - 4' }).success).toBe(
      true,
    );
  });

  it('rejects an empty expression', () => {
    expect(targetRequestSchema.safeParse({ sessionId: uuid, expression: '' }).success).toBe(false);
  });
});

describe('adminLoginRequestSchema', () => {
  it('accepts a non-empty password', () => {
    expect(adminLoginRequestSchema.safeParse({ password: 'hunter2' }).success).toBe(true);
  });

  it('rejects a missing password', () => {
    expect(adminLoginRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe('adminPuzzleRequestSchema', () => {
  it('accepts an ISO date, expression, and optional note', () => {
    expect(
      adminPuzzleRequestSchema.safeParse({
        puzzleDate: '2026-06-10',
        expression: 'x^2 - 4',
        note: 'intro quadratic',
      }).success,
    ).toBe(true);
  });

  it('accepts without a note', () => {
    expect(
      adminPuzzleRequestSchema.safeParse({ puzzleDate: '2026-06-10', expression: 'x' }).success,
    ).toBe(true);
  });

  it('rejects a malformed date', () => {
    expect(
      adminPuzzleRequestSchema.safeParse({ puzzleDate: '06/10/2026', expression: 'x' }).success,
    ).toBe(false);
  });
});
