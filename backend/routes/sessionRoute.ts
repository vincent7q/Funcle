import { Router, type Request, type Response } from 'express';
import type { NewSessionResponse, DailyResponse, Coefficients } from '../../shared/types';
import { TOTAL_TURNS } from '../../shared/types';
import { newSessionRequestSchema, dailyQuerySchema } from '../../shared/schemas';
import { generateRandom, generateFromDate, formatPolynomial } from '../engine/polynomial';
import {
  type Db,
  type DailyPuzzleRow,
  createSession,
  getSession,
  findDailySession,
  getDailyPuzzle,
  getNextPuzzleNumber,
  insertDailyPuzzle,
  getMoves,
} from '../db/db';

/** Today's date as an ISO calendar day (UTC), e.g. '2026-06-10'. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get today's curated puzzle, or deterministically generate + persist one as a
 * fallback so every player gets the same puzzle that day (spec §3.3). The check
 * and insert run synchronously (better-sqlite3), so no interleaving race.
 */
function resolveDailyPuzzle(db: Db, date: string): DailyPuzzleRow {
  const existing = getDailyPuzzle(db, date);
  if (existing) return existing;
  return insertDailyPuzzle(db, {
    puzzleDate: date,
    puzzleNumber: getNextPuzzleNumber(db),
    coefficients: generateFromDate(date),
    source: 'generated',
    note: null,
  });
}

/**
 * Session + daily-puzzle routes (spec §8, §3.1/§3.3). Mounted at `/api`.
 * The secret polynomial is stored only in the DB and is NEVER returned here.
 */
export function createSessionRouter(db: Db): Router {
  const router = Router();

  // POST /api/session/new — Free Play: generate a secret, store it, return only the id.
  router.post('/session/new', (req: Request, res: Response) => {
    const parsed = newSessionRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }
    const sessionId = createSession(db, {
      mode: 'freeplay',
      userId: parsed.data.userId,
      puzzleDate: null,
      coefficients: generateRandom(),
    });
    const body: NewSessionResponse = { sessionId, turnsRemaining: TOTAL_TURNS };
    res.json(body);
  });

  // GET /api/daily — start or resume today's daily puzzle.
  router.get('/daily', (req: Request, res: Response) => {
    const query = dailyQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: 'Invalid query' });
      return;
    }
    const userId = query.data.userId ?? null;
    const date = todayIso();
    const puzzle = resolveDailyPuzzle(db, date);

    // Resume an existing daily session for a known user, else start a new one.
    let session = userId ? findDailySession(db, userId, date) : undefined;
    if (!session) {
      const coefficients = JSON.parse(puzzle.coefficients) as Coefficients;
      const id = createSession(db, { mode: 'daily', userId, puzzleDate: date, coefficients });
      session = getSession(db, id);
    }

    const body: DailyResponse = {
      sessionId: session!.id,
      turnsRemaining: TOTAL_TURNS - session!.turns_used,
      puzzleNumber: puzzle.puzzle_number,
      history: getMoves(db, session!.id),
    };
    // The game is over for this player, so revealing the secret is no longer a
    // cheating risk — include it so the frontend can re-show the end screen.
    if (session!.status !== 'active') {
      const coeffs = JSON.parse(session!.coefficients) as Coefficients;
      body.secret = formatPolynomial(coeffs);
      body.secretCoeffs = coeffs;
    }
    res.json(body);
  });

  return router;
}
