import { Router, type Request, type Response } from 'express';
import type { ValResponse, IsIncResponse, TargetResponse } from '../../shared/types';

/**
 * Game command routes (spec §4.3, §8). Mounted at `/api/game`.
 * Stub responses for now — real logic arrives in Task 3.2.
 */
export const gameRoute = Router();

// POST /api/game/val
gameRoute.post('/val', (_req: Request, res: Response) => {
  const body: ValResponse = { result: 0, turnsRemaining: 6, gameStatus: 'active' };
  res.json(body);
});

// POST /api/game/is_inc
gameRoute.post('/is_inc', (_req: Request, res: Response) => {
  const body: IsIncResponse = { result: 'Stationary', turnsRemaining: 6, gameStatus: 'active' };
  res.json(body);
});

// POST /api/game/target
gameRoute.post('/target', (_req: Request, res: Response) => {
  const body: TargetResponse = { correct: false, gameStatus: 'active', turnsRemaining: 6 };
  res.json(body);
});
