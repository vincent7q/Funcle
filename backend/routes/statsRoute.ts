import { Router, type Request, type Response } from 'express';
import type { StatsResponse } from '../../shared/types';

/**
 * Stats route (spec §8). Mounted at `/api/stats`.
 * Stub response for now — real logic arrives in Task 7.2.
 */
export const statsRoute = Router();

// GET /api/stats/:userId
statsRoute.get('/:userId', (_req: Request, res: Response) => {
  const body: StatsResponse = {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    winDistribution: {},
  };
  res.json(body);
});
