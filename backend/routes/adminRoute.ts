import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { AdminLoginResponse, AdminPuzzleSummary, Coefficients } from '../../shared/types';
import { adminLoginRequestSchema, adminPuzzleRequestSchema, adminPuzzlesQuerySchema } from '../../shared/schemas';
import {
  type Db,
  getPuzzlesInRange,
  getDailyPuzzle,
  getNextPuzzleNumber,
  insertDailyPuzzle,
  updateDailyPuzzle,
  deleteDailyPuzzle,
} from '../db/db';
import { parsePolynomialExpression } from '../engine/parser';
import { formatPolynomial } from '../engine/polynomial';
import { createAdminAuth } from '../middleware/adminAuth';
import type { AdminConfig } from '../config';

/** Today as an ISO calendar day (UTC). */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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

  // --- Protected puzzle management (spec §3.3, §8) ---

  // GET /api/admin/puzzles?from&to
  router.get('/puzzles', requireAdmin, (req: Request, res: Response) => {
    const query = adminPuzzlesQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: 'Invalid query' });
      return;
    }
    const rows = getPuzzlesInRange(db, query.data.from, query.data.to);
    const summaries: AdminPuzzleSummary[] = rows.map((r) => ({
      puzzleDate: r.puzzle_date,
      puzzleNumber: r.puzzle_number,
      expression: formatPolynomial(JSON.parse(r.coefficients) as Coefficients),
      note: r.note,
      source: r.source,
    }));
    res.json(summaries);
  });

  // POST /api/admin/puzzles — schedule a (today-or-future) puzzle.
  router.post('/puzzles', requireAdmin, (req: Request, res: Response) => {
    const parsed = adminPuzzleRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }
    const { puzzleDate, expression, note } = parsed.data;
    if (puzzleDate < todayIso()) {
      res.status(400).json({ error: 'Cannot schedule a puzzle for a past date' });
      return;
    }
    const poly = parsePolynomialExpression(expression);
    if (!poly.ok) {
      res.status(400).json({ error: `Polynomial violates rules: ${poly.reason}` });
      return;
    }
    if (getDailyPuzzle(db, puzzleDate)) {
      res.status(409).json({ error: 'A puzzle already exists for that date' });
      return;
    }
    const row = insertDailyPuzzle(db, {
      puzzleDate,
      puzzleNumber: getNextPuzzleNumber(db),
      coefficients: poly.coeffs,
      source: 'curated',
      note: note ?? null,
    });
    res.json({ puzzleDate: row.puzzle_date, puzzleNumber: row.puzzle_number });
  });

  // PUT /api/admin/puzzles/:date — edit a FUTURE puzzle (today/past are locked).
  router.put('/puzzles/:date', requireAdmin, (req: Request, res: Response) => {
    const date = req.params.date;
    if (date <= todayIso()) {
      res.status(403).json({ error: "Today's and past puzzles are locked" });
      return;
    }
    const parsed = adminPuzzleRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }
    const poly = parsePolynomialExpression(parsed.data.expression);
    if (!poly.ok) {
      res.status(400).json({ error: `Polynomial violates rules: ${poly.reason}` });
      return;
    }
    if (!getDailyPuzzle(db, date)) {
      res.status(404).json({ error: 'No puzzle scheduled for that date' });
      return;
    }
    updateDailyPuzzle(db, date, { coefficients: poly.coeffs, note: parsed.data.note ?? null });
    res.json({ puzzleDate: date, updated: true });
  });

  // DELETE /api/admin/puzzles/:date — remove a FUTURE puzzle.
  router.delete('/puzzles/:date', requireAdmin, (req: Request, res: Response) => {
    const date = req.params.date;
    if (date <= todayIso()) {
      res.status(403).json({ error: "Today's and past puzzles are locked" });
      return;
    }
    deleteDailyPuzzle(db, date);
    res.json({ puzzleDate: date, deleted: true });
  });

  return router;
}
