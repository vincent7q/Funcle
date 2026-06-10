import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../server';
import { openDb } from '../db/db';

/** Fresh app over an isolated in-memory DB. */
const freshApp = () => createApp(openDb(':memory:'));

describe('POST /api/session/new', () => {
  it('returns a uuid session with 6 turns and never leaks the secret', async () => {
    const res = await request(freshApp()).post('/api/session/new').send({ userId: null });
    expect(res.status).toBe(200);
    expect(res.body.turnsRemaining).toBe(6);
    expect(res.body.sessionId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(res.body).not.toHaveProperty('secret');
    expect(res.body).not.toHaveProperty('coefficients');
  });

  it('rejects an invalid body with 400', async () => {
    const res = await request(freshApp()).post('/api/session/new').send({ userId: 42 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/daily', () => {
  it('auto-generates a puzzle, returns 6 turns, and never leaks coefficients', async () => {
    const res = await request(freshApp()).get('/api/daily');
    expect(res.status).toBe(200);
    expect(res.body.turnsRemaining).toBe(6);
    expect(typeof res.body.puzzleNumber).toBe('number');
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.history).toHaveLength(0);
    expect(res.body).not.toHaveProperty('secret');
    expect(res.body).not.toHaveProperty('coefficients');
  });

  it('serves the same puzzle number on repeated calls the same day', async () => {
    const app = freshApp(); // one shared DB across both calls
    const r1 = await request(app).get('/api/daily');
    const r2 = await request(app).get('/api/daily');
    expect(r2.body.puzzleNumber).toBe(r1.body.puzzleNumber);
  });

  it('resumes the same session for a known userId', async () => {
    const app = freshApp();
    const r1 = await request(app).get('/api/daily').query({ userId: 'u1' });
    const r2 = await request(app).get('/api/daily').query({ userId: 'u1' });
    expect(r2.body.sessionId).toBe(r1.body.sessionId);
  });

  it('rejects an invalid query with 400', async () => {
    const res = await request(freshApp()).get('/api/daily').query({ userId: '' });
    expect(res.status).toBe(400);
  });

  it('reveals the secret only once the resumed daily game is finished', async () => {
    const app = freshApp();
    const start = await request(app).get('/api/daily').query({ userId: 'u1' });
    const sessionId = start.body.sessionId as string;

    // Mid-game resume must still hide the secret.
    await request(app).post('/api/game/val').send({ sessionId, x: 1 });
    const midway = await request(app).get('/api/daily').query({ userId: 'u1' });
    expect(midway.body).not.toHaveProperty('secret');
    expect(midway.body).not.toHaveProperty('secretCoeffs');

    // Exhaust the remaining turns so the game is lost.
    for (let x = 2; x <= 6; x++) {
      await request(app).post('/api/game/val').send({ sessionId, x });
    }

    const resumed = await request(app).get('/api/daily').query({ userId: 'u1' });
    expect(resumed.body.turnsRemaining).toBe(0);
    expect(typeof resumed.body.secret).toBe('string');
    expect(Array.isArray(resumed.body.secretCoeffs)).toBe(true);
  });
});
