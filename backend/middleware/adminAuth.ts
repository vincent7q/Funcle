import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Express middleware that verifies the admin JWT on protected `/api/admin/*`
 * routes (spec §3.3, §11). Expects an `Authorization: Bearer <token>` header;
 * responds 401 if the token is missing or invalid.
 */
export function createAdminAuth(jwtSecret: string): RequestHandler {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing admin token' });
      return;
    }
    try {
      jwt.verify(header.slice('Bearer '.length), jwtSecret);
      next();
    } catch {
      res.status(401).json({ error: 'Invalid admin token' });
    }
  };
}
