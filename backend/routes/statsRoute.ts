import { Router, type Request, type Response } from 'express';
import { type Db, getStats } from '../db/db';

/**
 * Stats route (spec §5.2, §8). Mounted at `/api/stats`. The `:userId` is either
 * an account id or an anonymous browser UUID; unknown ids return zeros.
 */
export function createStatsRouter(db: Db): Router {
  const router = Router();

  // GET /api/stats/:userId
  router.get('/:userId', (req: Request, res: Response) => {
    res.json(getStats(db, req.params.userId));
  });

  return router;
}
