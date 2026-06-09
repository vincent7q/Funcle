import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../server';
import { openDb, createSession, type Db } from '../db/db';

/** Start a daily game for `userId` with a known secret (x^2 - 4). */
function newGame(db: Db, userId: string): string {
  return createSession(db, {
    mode: 'daily',
    userId,
    puzzleDate: '2026-06-10',
    coefficients: [1, 0, -4],
  });
}

const target = (app: Express, sessionId: string, expression: string) =>
  request(app).post('/api/game/target').send({ sessionId, expression });
const val = (app: Express, sessionId: string, x: number) =>
  request(app).post('/api/game/val').send({ sessionId, x });

describe('GET /api/stats/:userId', () => {
  it('returns zeros for an unknown player', async () => {
    const app = createApp(openDb(':memory:'));
    const res = await request(app).get('/api/stats/nobody');
    expect(res.body).toEqual({
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      winDistribution: {},
    });
  });

  it('records a win with the turn bucketed into the distribution', async () => {
    const db = openDb(':memory:');
    const app = createApp(db);
    await target(app, newGame(db, 'u1'), 'x^2 - 4'); // win on turn 1
    const res = await request(app).get('/api/stats/u1');
    expect(res.body).toMatchObject({ gamesPlayed: 1, gamesWon: 1, currentStreak: 1, maxStreak: 1 });
    expect(res.body.winDistribution).toEqual({ '1': 1 });
  });

  it('increments the streak on consecutive wins', async () => {
    const db = openDb(':memory:');
    const app = createApp(db);
    await target(app, newGame(db, 'u2'), 'x^2 - 4'); // win on turn 1
    const s2 = newGame(db, 'u2');
    await val(app, s2, 0);
    await val(app, s2, 1);
    await target(app, s2, 'x^2 - 4'); // win on turn 3
    const res = await request(app).get('/api/stats/u2');
    expect(res.body.currentStreak).toBe(2);
    expect(res.body.maxStreak).toBe(2);
    expect(res.body.gamesPlayed).toBe(2);
    expect(res.body.winDistribution).toEqual({ '1': 1, '3': 1 });
  });

  it('resets the streak to 0 on a loss but keeps max streak', async () => {
    const db = openDb(':memory:');
    const app = createApp(db);
    await target(app, newGame(db, 'u3'), 'x^2 - 4'); // win
    const s = newGame(db, 'u3');
    for (let i = 0; i < 6; i++) await target(app, s, 'x + 1'); // lose (6 wrong)
    const res = await request(app).get('/api/stats/u3');
    expect(res.body).toMatchObject({
      gamesPlayed: 2,
      gamesWon: 1,
      currentStreak: 0,
      maxStreak: 1,
    });
  });
});
