import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';

/**
 * Builds the Express application. Kept separate from `listen` so tests can
 * import the app without binding a port. Routes are mounted here as the
 * backend grows (see spec §8/§11).
 */
export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check / hello-world route (Task 0.1 acceptance).
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'funcle-backend' });
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
