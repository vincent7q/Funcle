/**
 * Funcle API request schemas (zod) — the runtime-validation boundary for every
 * request body (spec §2.1, §8). Types are derived via `z.infer` so the runtime
 * schema and the compile-time type share one source of truth.
 *
 * Only *requests* are validated at runtime; response shapes live as plain types
 * in `types.ts` since the backend produces them and never needs to parse them.
 */
import { z } from 'zod';

/** A finite JS number (rejects NaN / ±Infinity). Used for all `x` inputs. */
const finiteNumber = z.number().finite();

/** ISO calendar date, e.g. `2026-06-10` (spec §9 daily_puzzles.puzzle_date). */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD)');

/** POST /api/session/new */
export const newSessionRequestSchema = z.object({
  userId: z.string().min(1).nullable(),
});
export type NewSessionRequest = z.infer<typeof newSessionRequestSchema>;

/** GET /api/daily — optional userId query param. */
export const dailyQuerySchema = z.object({
  userId: z.string().min(1).optional(),
});
export type DailyQuery = z.infer<typeof dailyQuerySchema>;

/** POST /api/game/val and /api/game/is_inc share the same body. */
export const valRequestSchema = z.object({
  sessionId: z.string().uuid(),
  x: finiteNumber,
});
export type ValRequest = z.infer<typeof valRequestSchema>;

export const isIncRequestSchema = valRequestSchema;
export type IsIncRequest = z.infer<typeof isIncRequestSchema>;

/** POST /api/game/target */
export const targetRequestSchema = z.object({
  sessionId: z.string().uuid(),
  expression: z.string().min(1),
});
export type TargetRequest = z.infer<typeof targetRequestSchema>;

/** POST /api/admin/login */
export const adminLoginRequestSchema = z.object({
  password: z.string().min(1),
});
export type AdminLoginRequest = z.infer<typeof adminLoginRequestSchema>;

/** POST /api/admin/puzzles and PUT /api/admin/puzzles/:date */
export const adminPuzzleRequestSchema = z.object({
  puzzleDate: isoDate,
  expression: z.string().min(1),
  note: z.string().optional(),
});
export type AdminPuzzleRequest = z.infer<typeof adminPuzzleRequestSchema>;

/** GET /api/admin/puzzles — optional date-range bounds. */
export const adminPuzzlesQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type AdminPuzzlesQuery = z.infer<typeof adminPuzzlesQuerySchema>;
