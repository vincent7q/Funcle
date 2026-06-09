import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { NewSessionResponse, DailyResponse } from '../../shared/types';

/**
 * Session + daily-puzzle routes (spec §8). Mounted at `/api`.
 * Stub responses for now — real logic arrives in Task 3.1.
 */
export const sessionRoute = Router();

// POST /api/session/new
sessionRoute.post('/session/new', (_req: Request, res: Response) => {
  const body: NewSessionResponse = { sessionId: randomUUID(), turnsRemaining: 6 };
  res.json(body);
});

// GET /api/daily
sessionRoute.get('/daily', (_req: Request, res: Response) => {
  const body: DailyResponse = {
    sessionId: randomUUID(),
    turnsRemaining: 6,
    puzzleNumber: 0,
    history: [],
  };
  res.json(body);
});
