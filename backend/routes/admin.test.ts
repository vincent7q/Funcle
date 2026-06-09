import { describe, it, expect } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../server';
import { openDb } from '../db/db';

const PASSWORD = 'correct horse';
const config = { passwordHash: bcrypt.hashSync(PASSWORD, 10), jwtSecret: 'test-secret' };

const freshApp = () => createApp(openDb(':memory:'), config);

async function login(app: ReturnType<typeof freshApp>, password: string) {
  return request(app).post('/api/admin/login').send({ password });
}

describe('POST /api/admin/login', () => {
  it('returns a token for the correct password', async () => {
    const res = await login(freshApp(), PASSWORD);
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a wrong password with 401', async () => {
    const res = await login(freshApp(), 'nope');
    expect(res.status).toBe(401);
  });

  it('rate-limits repeated attempts with 429', async () => {
    const app = freshApp();
    let last;
    for (let i = 0; i < 6; i++) last = await login(app, 'nope');
    expect(last!.status).toBe(429);
  });
});

describe('admin auth middleware', () => {
  it('rejects a protected route with no token (401)', async () => {
    const res = await request(freshApp()).get('/api/admin/puzzles');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token (401)', async () => {
    const res = await request(freshApp())
      .get('/api/admin/puzzles')
      .set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });

  it('allows a protected route with a valid token', async () => {
    const app = freshApp();
    const token = (await login(app, PASSWORD)).body.token;
    const res = await request(app)
      .get('/api/admin/puzzles')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
