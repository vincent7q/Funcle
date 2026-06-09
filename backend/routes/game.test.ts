import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Coefficients } from '../../shared/types';
import { createApp } from '../server';
import { openDb, createSession } from '../db/db';

/** Fresh app + DB + a session whose secret we control. Default x^2 - 4. */
function setup(coefficients: Coefficients = [1, 0, -4]) {
  const db = openDb(':memory:');
  const app = createApp(db);
  const sessionId = createSession(db, {
    mode: 'freeplay',
    userId: null,
    puzzleDate: null,
    coefficients,
  });
  return { app, sessionId };
}

describe('POST /api/game/val', () => {
  it('evaluates f(x), consumes one turn, and never leaks the secret', async () => {
    const { app, sessionId } = setup();
    const res = await request(app).post('/api/game/val').send({ sessionId, x: 3 });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe(5);
    expect(res.body.turnsRemaining).toBe(5);
    expect(res.body.gameStatus).toBe('active');
    expect(res.body).not.toHaveProperty('secret');
  });

  it('returns "error" for invalid x WITHOUT consuming a turn (§13 Q4)', async () => {
    const { app, sessionId } = setup();
    const bad = await request(app).post('/api/game/val').send({ sessionId, x: 'foo' });
    expect(bad.body.result).toBe('error');
    expect(bad.body.turnsRemaining).toBe(6);
    // A subsequent valid call still has all 6 turns available.
    const good = await request(app).post('/api/game/val').send({ sessionId, x: 0 });
    expect(good.body.result).toBe(-4);
    expect(good.body.turnsRemaining).toBe(5);
  });

  it('404s for an unknown session', async () => {
    const { app } = setup();
    const res = await request(app)
      .post('/api/game/val')
      .send({ sessionId: '00000000-0000-0000-0000-000000000000', x: 1 });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/game/is_inc', () => {
  it('reports direction from the derivative (2x for x^2 - 4)', async () => {
    const { app, sessionId } = setup();
    expect((await request(app).post('/api/game/is_inc').send({ sessionId, x: 3 })).body.result).toBe(
      'Increasing',
    );
  });

  it('reports Stationary at x=0 and Decreasing at x<0', async () => {
    const dec = setup();
    expect(
      (await request(dec.app).post('/api/game/is_inc').send({ sessionId: dec.sessionId, x: -3 }))
        .body.result,
    ).toBe('Decreasing');
    const stat = setup();
    expect(
      (await request(stat.app).post('/api/game/is_inc').send({ sessionId: stat.sessionId, x: 0 }))
        .body.result,
    ).toBe('Stationary');
  });
});

describe('POST /api/game/target', () => {
  it('wins on an equivalent guess and reveals the secret', async () => {
    const { app, sessionId } = setup();
    const res = await request(app)
      .post('/api/game/target')
      .send({ sessionId, expression: '(x-2)(x+2)' });
    expect(res.status).toBe(200);
    expect(res.body.correct).toBe(true);
    expect(res.body.gameStatus).toBe('won');
    expect(res.body.turnsUsed).toBe(1);
    expect(res.body.secret).toBe('x^2 - 4');
  });

  it('a wrong guess consumes a turn and keeps the secret hidden while active', async () => {
    const { app, sessionId } = setup();
    const res = await request(app)
      .post('/api/game/target')
      .send({ sessionId, expression: 'x^2 - 3' });
    expect(res.body.correct).toBe(false);
    expect(res.body.gameStatus).toBe('active');
    expect(res.body.turnsRemaining).toBe(5);
    expect(res.body).not.toHaveProperty('secret');
  });

  it('rejects a command after the game is over (409)', async () => {
    const { app, sessionId } = setup();
    await request(app).post('/api/game/target').send({ sessionId, expression: 'x^2-4' }); // win
    const after = await request(app).post('/api/game/val').send({ sessionId, x: 1 });
    expect(after.status).toBe(409);
  });
});

describe('game loss', () => {
  it('becomes lost after 6 wrong guesses and reveals the secret on the last', async () => {
    const { app, sessionId } = setup();
    let last;
    for (let i = 0; i < 6; i++) {
      last = await request(app).post('/api/game/target').send({ sessionId, expression: 'x + 1' });
    }
    expect(last!.body.gameStatus).toBe('lost');
    expect(last!.body.turnsRemaining).toBe(0);
    expect(last!.body.secret).toBe('x^2 - 4');
  });

  it('a val on the final turn ends the game as lost and reveals the secret', async () => {
    const { app, sessionId } = setup();
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/game/val').send({ sessionId, x: i });
    }
    const sixth = await request(app).post('/api/game/val').send({ sessionId, x: 9 });
    expect(sixth.body.gameStatus).toBe('lost');
    expect(sixth.body.turnsRemaining).toBe(0);
    expect(sixth.body.secret).toBe('x^2 - 4');
  });
});
