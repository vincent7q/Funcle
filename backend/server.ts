import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import { sessionRoute } from './routes/sessionRoute';
import { gameRoute } from './routes/gameRoute';
import { statsRoute } from './routes/statsRoute';
import { adminRoute } from './routes/adminRoute';

/**
 * Builds the Express application. Kept separate from `listen` so tests can
 * import the app without binding a port. (spec §8/§11)
 */
export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check / hello-world route.
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'funcle-backend' });
  });

  // Feature routers (stubs for now; real logic lands in Phases 3, 6, 7).
  app.use('/api', sessionRoute);
  app.use('/api/game', gameRoute);
  app.use('/api/stats', statsRoute);
  app.use('/api/admin', adminRoute);

  // Central error handler — last middleware. Returns JSON so clients never get
  // an HTML error page. Express routes a thrown/`next(err)` error here.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  });

  return app;
}

export const app = createApp();

// Only start listening when run directly (not when imported by tests).
if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Funcle backend listening on http://localhost:${port}`);
  });
}
