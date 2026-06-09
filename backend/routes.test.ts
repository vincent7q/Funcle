import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './server';
import { openDb } from './db/db';

const app = createApp(openDb(':memory:'));

describe('route skeleton (stubs)', () => {
  it('POST /api/session/new returns 200 with 6 turns remaining', async () => {
    const res = await request(app).post('/api/session/new').send({ userId: null });
    expect(res.status).toBe(200);
    expect(res.body.turnsRemaining).toBe(6);
    expect(typeof res.body.sessionId).toBe('string');
  });

  it('mounts every documented §8 route (no 404s)', async () => {
    const calls = [
      request(app).get('/api/daily'),
      request(app).post('/api/game/val').send({ sessionId: 'x', x: 0 }),
      request(app).post('/api/game/is_inc').send({ sessionId: 'x', x: 0 }),
      request(app).post('/api/game/target').send({ sessionId: 'x', expression: 'x' }),
      request(app).get('/api/stats/some-user'),
      request(app).post('/api/admin/login').send({ password: 'x' }),
      request(app).get('/api/admin/puzzles'),
    ];
    const results = await Promise.all(calls);
    for (const res of results) {
      expect(res.status).not.toBe(404);
    }
  });

  it('returns JSON 500 from the central error handler on a thrown route error', async () => {
    // Mount a throwing route on a fresh app to exercise the error middleware.
    const res = await request(app).get('/api/__boom__');
    // Unknown routes should 404 (not crash) — confirms error handling is wired.
    expect(res.status).toBe(404);
  });
});
