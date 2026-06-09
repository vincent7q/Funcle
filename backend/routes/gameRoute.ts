import { Router, type Request, type Response } from 'express';
import type {
  Coefficients,
  IsIncResult,
  ValResponse,
  IsIncResponse,
  TargetResponse,
} from '../../shared/types';
import { TOTAL_TURNS } from '../../shared/types';
import { targetRequestSchema } from '../../shared/schemas';
import { evaluate, formatPolynomial } from '../engine/polynomial';
import { evaluateDirection } from '../engine/derivative';
import { isEquivalent } from '../engine/parser';
import {
  type Db,
  type SessionRow,
  getSession,
  updateSession,
  insertMove,
  recordGameResult,
} from '../db/db';

/**
 * Game command routes (spec §4.2/§4.3, §8). Mounted at `/api/game`.
 *
 * Turn rules: every *valid* command consumes one turn; invalid `x` returns
 * `"error"` and consumes nothing (§13 Q4). The secret is revealed only when the
 * game ends — on a winning `target`, or when the 6th turn is used without a win.
 */
export function createGameRouter(db: Db): Router {
  const router = Router();

  /** Load the session for this request, guarding missing id / not-found / over. */
  function loadActiveSession(req: Request, res: Response): SessionRow | null {
    const sessionId: unknown = req.body?.sessionId;
    if (typeof sessionId !== 'string') {
      res.status(400).json({ error: 'sessionId is required' });
      return null;
    }
    const session = getSession(db, sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return null;
    }
    if (session.status !== 'active') {
      res.status(409).json({ error: 'Game is already over' });
      return null;
    }
    return session;
  }

  // POST /api/game/val
  router.post('/val', (req: Request, res: Response) => {
    const session = loadActiveSession(req, res);
    if (!session) return;

    const x: unknown = req.body?.x;
    if (typeof x !== 'number' || !Number.isFinite(x)) {
      const body: ValResponse = {
        result: 'error',
        turnsRemaining: TOTAL_TURNS - session.turns_used,
        gameStatus: 'active',
      };
      res.json(body);
      return;
    }

    const coeffs = JSON.parse(session.coefficients) as Coefficients;
    const result = evaluate(coeffs, x);
    res.json(commitClue(db, session, { command: 'val', inputX: x, result: String(result) }, result));
  });

  // POST /api/game/is_inc
  router.post('/is_inc', (req: Request, res: Response) => {
    const session = loadActiveSession(req, res);
    if (!session) return;

    const x: unknown = req.body?.x;
    if (typeof x !== 'number' || !Number.isFinite(x)) {
      const body: IsIncResponse = {
        result: 'error',
        turnsRemaining: TOTAL_TURNS - session.turns_used,
        gameStatus: 'active',
      };
      res.json(body);
      return;
    }

    const coeffs = JSON.parse(session.coefficients) as Coefficients;
    const result = evaluateDirection(coeffs, x);
    res.json(commitClue(db, session, { command: 'is_inc', inputX: x, result }, result));
  });

  // POST /api/game/target
  router.post('/target', (req: Request, res: Response) => {
    const parsed = targetRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }
    const session = getSession(db, parsed.data.sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.status !== 'active') {
      res.status(409).json({ error: 'Game is already over' });
      return;
    }

    const coeffs = JSON.parse(session.coefficients) as Coefficients;
    const turn = session.turns_used + 1;
    const correct = isEquivalent(parsed.data.expression, coeffs);

    insertMove(db, {
      sessionId: session.id,
      turnNumber: turn,
      command: 'target',
      inputX: null,
      expression: parsed.data.expression,
      result: correct ? 'correct' : 'wrong',
    });

    if (correct) {
      updateSession(db, session.id, { status: 'won', turnsUsed: turn });
      if (session.user_id) recordGameResult(db, session.user_id, { won: true, turnsUsed: turn });
      const body: TargetResponse = {
        correct: true,
        gameStatus: 'won',
        turnsUsed: turn,
        secret: formatPolynomial(coeffs),
        secretCoeffs: coeffs,
      };
      res.json(body);
      return;
    }

    const lost = turn >= TOTAL_TURNS;
    updateSession(db, session.id, { status: lost ? 'lost' : 'active', turnsUsed: turn });
    if (lost && session.user_id) {
      recordGameResult(db, session.user_id, { won: false, turnsUsed: turn });
    }
    const body: TargetResponse = {
      correct: false,
      gameStatus: lost ? 'lost' : 'active',
      turnsRemaining: TOTAL_TURNS - turn,
      ...(lost ? { secret: formatPolynomial(coeffs), secretCoeffs: coeffs } : {}),
    };
    res.json(body);
  });

  return router;
}

/**
 * Persist a val/is_inc clue, advance the turn, and build the response. If the
 * clue uses the final turn (no win), the game ends as 'lost' and reveals the
 * secret (§4.2).
 */
function commitClue(
  db: Db,
  session: SessionRow,
  move: { command: 'val' | 'is_inc'; inputX: number; result: string },
  result: number | IsIncResult,
): ValResponse | IsIncResponse {
  const turn = session.turns_used + 1;
  insertMove(db, {
    sessionId: session.id,
    turnNumber: turn,
    command: move.command,
    inputX: move.inputX,
    expression: null,
    result: move.result,
  });
  const lost = turn >= TOTAL_TURNS;
  updateSession(db, session.id, { status: lost ? 'lost' : 'active', turnsUsed: turn });
  if (lost && session.user_id) {
    recordGameResult(db, session.user_id, { won: false, turnsUsed: turn });
  }

  const body = {
    result,
    turnsRemaining: TOTAL_TURNS - turn,
    gameStatus: lost ? ('lost' as const) : ('active' as const),
  } as ValResponse | IsIncResponse;
  if (lost) {
    const coeffs = JSON.parse(session.coefficients) as Coefficients;
    body.secret = formatPolynomial(coeffs);
    body.secretCoeffs = coeffs;
  }
  return body;
}
