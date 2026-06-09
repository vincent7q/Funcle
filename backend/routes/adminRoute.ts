import { Router, type Request, type Response } from 'express';
import type { AdminLoginResponse, AdminPuzzleSummary } from '../../shared/types';

/**
 * Admin / daily-puzzle management routes (spec §3.3, §8). Mounted at `/api/admin`.
 * Stub responses for now — real auth (Task 6.1) and CRUD (Task 6.2) arrive later.
 * NOTE: these stubs are intentionally unauthenticated; adminAuth middleware and
 * real validation will gate them in Phase 6.
 */
export const adminRoute = Router();

// POST /api/admin/login
adminRoute.post('/login', (_req: Request, res: Response) => {
  const body: AdminLoginResponse = { token: 'stub-token' };
  res.json(body);
});

// GET /api/admin/puzzles
adminRoute.get('/puzzles', (_req: Request, res: Response) => {
  const body: AdminPuzzleSummary[] = [];
  res.json(body);
});

// POST /api/admin/puzzles
adminRoute.post('/puzzles', (_req: Request, res: Response) => {
  res.json({ puzzleDate: '1970-01-01', puzzleNumber: 0 });
});

// PUT /api/admin/puzzles/:date
adminRoute.put('/puzzles/:date', (req: Request, res: Response) => {
  res.json({ puzzleDate: req.params.date, puzzleNumber: 0 });
});

// DELETE /api/admin/puzzles/:date
adminRoute.delete('/puzzles/:date', (req: Request, res: Response) => {
  res.json({ puzzleDate: req.params.date, deleted: true });
});
