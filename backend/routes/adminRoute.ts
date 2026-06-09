import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { AdminLoginResponse, AdminPuzzleSummary } from '../../shared/types';
import { adminLoginRequestSchema } from '../../shared/schemas';
import type { Db } from '../db/db';
import { createAdminAuth } from '../middleware/adminAuth';
import type { AdminConfig } from '../config';

/**
 * Admin / daily-puzzle management routes (spec §3.3, §8). Mounted at `/api/admin`.
 * Login is bcrypt-checked + rate-limited; all other routes require a valid JWT.
 * Puzzle CRUD handlers are stubs until Task 6.2.
 */
export function createAdminRouter(db: Db, config: AdminConfig): Router {
  const router = Router();
  const requireAdmin = createAdminAuth(config.jwtSecret);

  // Brute-force protection: a few attempts per IP per window (spec §3.3).
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts, try again later' },
  });

  // POST /api/admin/login
  router.post('/login', loginLimiter, (req: Request, res: Response) => {
    const parsed = adminLoginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }
    const ok =
      config.passwordHash !== '' && bcrypt.compareSync(parsed.data.password, config.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }
    const token = jwt.sign({ role: 'admin' }, config.jwtSecret, { expiresIn: '2h' });
    const body: AdminLoginResponse = { token };
    res.json(body);
  });

  // --- Protected puzzle management (stubs until Task 6.2) ---

  router.get('/puzzles', requireAdmin, (_req: Request, res: Response) => {
    res.json([] as AdminPuzzleSummary[]);
  });

  router.post('/puzzles', requireAdmin, (_req: Request, res: Response) => {
    res.json({ puzzleDate: '1970-01-01', puzzleNumber: 0 });
  });

  router.put('/puzzles/:date', requireAdmin, (req: Request, res: Response) => {
    res.json({ puzzleDate: req.params.date, puzzleNumber: 0 });
  });

  router.delete('/puzzles/:date', requireAdmin, (req: Request, res: Response) => {
    res.json({ puzzleDate: req.params.date, deleted: true });
  });

  return router;
}
