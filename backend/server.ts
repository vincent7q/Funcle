import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { openDb, type Db } from './db/db';
import { createSessionRouter } from './routes/sessionRoute';
import { gameRoute } from './routes/gameRoute';
import { statsRoute } from './routes/statsRoute';
import { adminRoute } from './routes/adminRoute';

/**
 * Builds the Express application around a database connection. The DB is
 * injected so tests can pass an isolated in-memory database. (spec §8/§11)
 */
export function createApp(db: Db): Express {
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
  app.use('/api/game', gameRoute);
  app.use('/api/stats', statsRoute);
  app.use('/api/admin', adminRoute);

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
  const app = createApp(openDb(dbPath));
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Funcle backend listening on http://localhost:${port}`);
  });
}
