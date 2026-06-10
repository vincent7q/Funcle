import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import type { AuthResponse } from '../../shared/types';
import { registerRequestSchema, loginRequestSchema } from '../../shared/schemas';
import { type Db, createUser, getUserByUsername } from '../db/db';

/**
 * Optional player accounts (spec §5.1). Mounted at `/api/auth`. Passwords are
 * stored only as bcrypt hashes. Anonymous play needs no account (the frontend
 * uses a browser-local UUID instead).
 */
export function createAuthRouter(db: Db): Router {
  const router = Router();

  // POST /api/auth/register
  router.post('/register', (req: Request, res: Response) => {
    const parsed = registerRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }
    if (getUserByUsername(db, parsed.data.username)) {
      res.status(409).json({ error: 'Username is already taken' });
      return;
    }
    const userId = createUser(db, {
      username: parsed.data.username,
      passwordHash: bcrypt.hashSync(parsed.data.password, 10),
    });
    const body: AuthResponse = { userId, username: parsed.data.username };
    res.json(body);
  });

  // POST /api/auth/login
  router.post('/login', (req: Request, res: Response) => {
    const parsed = loginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }
    const user = getUserByUsername(db, parsed.data.username);
    if (!user || !bcrypt.compareSync(parsed.data.password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }
    const body: AuthResponse = { userId: user.id, username: user.username };
    res.json(body);
  });

  return router;
}
