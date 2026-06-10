import 'dotenv/config';
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { openDb, type Db } from './db/db';
import { getAdminConfig, type AdminConfig } from './config';
import { createSessionRouter } from './routes/sessionRoute';
import { createGameRouter } from './routes/gameRoute';
import { createAuthRouter } from './routes/authRoute';
import { createStatsRouter } from './routes/statsRoute';
import { createAdminRouter } from './routes/adminRoute';

/**
 * Builds the Express application around a database connection. The DB is
 * injected so tests can pass an isolated in-memory database. (spec §8/§11)
 *
 * `staticDir` (optional) enables single-origin production serving (spec §15):
 * the built frontend is served as static files, with an SPA fallback to
 * index.html for non-API GET routes (e.g. /admin).
 */
export function createApp(
  db: Db,
  adminConfig: AdminConfig = getAdminConfig(),
  staticDir?: string,
): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check / hello-world route.
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'funcle-backend' });
  });

  // Feature routers. session is wired to the DB; game/stats/admin are still
  // stubs (real logic lands in Phases 3.2, 7, 6 respectively).
  app.use('/api', createSessionRouter(db));
  app.use('/api/game', createGameRouter(db));
  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/stats', createStatsRouter(db));
  app.use('/api/admin', createAdminRouter(db, adminConfig));

  // Single-origin production mode (spec §15): serve the built frontend, with an
  // SPA fallback so client-routed paths like /admin load index.html.
  if (staticDir) {
    app.use(express.static(staticDir));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(join(staticDir, 'index.html'));
    });
  }

  // Central error handler — last middleware. Returns JSON, never an HTML page.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  });

  return app;
}

// Only open the DB + start listening when run directly (not when imported by tests).
if (require.main === module) {
  const dbPath = process.env.DB_PATH ?? './data/funcle.db';
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  // STATIC_DIR enables single-origin serving in production (spec §15).
  const staticDir = process.env.STATIC_DIR ? resolve(process.env.STATIC_DIR) : undefined;
  if (staticDir && !existsSync(staticDir)) {
    console.warn(`STATIC_DIR not found, skipping static serving: ${staticDir}`);
  }
  const app = createApp(
    openDb(dbPath),
    getAdminConfig(),
    staticDir && existsSync(staticDir) ? staticDir : undefined,
  );
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Funcle backend listening on http://localhost:${port}`);
  });
}
