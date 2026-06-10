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

  it('rejects a malformed login body with 400', async () => {
    const res = await request(freshApp()).post('/api/admin/login').send({});
    expect(res.status).toBe(400);
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

describe('admin puzzle CRUD', () => {
  const FUTURE = '2999-01-01';
  const PAST = '2000-01-01';
  const authed = (app: ReturnType<typeof freshApp>, token: string) => ({
    post: () => request(app).post('/api/admin/puzzles').set('Authorization', `Bearer ${token}`),
    get: () => request(app).get('/api/admin/puzzles').set('Authorization', `Bearer ${token}`),
    put: (d: string) =>
      request(app).put(`/api/admin/puzzles/${d}`).set('Authorization', `Bearer ${token}`),
    del: (d: string) =>
      request(app).delete(`/api/admin/puzzles/${d}`).set('Authorization', `Bearer ${token}`),
  });
  const token = (app: ReturnType<typeof freshApp>) => login(app, PASSWORD).then((r) => r.body.token);

  it('schedules a valid puzzle and lists it (formatted)', async () => {
    const app = freshApp();
    const a = authed(app, await token(app));
    const post = await a.post().send({ puzzleDate: FUTURE, expression: '(x-2)(x+2)', note: 'intro' });
    expect(post.status).toBe(200);
    expect(post.body.puzzleDate).toBe(FUTURE);

    const list = await a.get();
    const row = list.body.find((p: { puzzleDate: string }) => p.puzzleDate === FUTURE);
    expect(row).toMatchObject({ expression: 'x^2 - 4', note: 'intro', source: 'curated' });
  });

  it('rejects an invalid expression with 400 and a reason', async () => {
    const app = freshApp();
    const a = authed(app, await token(app));
    const res = await a.post().send({ puzzleDate: FUTURE, expression: 'x^4' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/rule|degree|polynomial/i);
  });

  it('rejects a duplicate date with 409', async () => {
    const app = freshApp();
    const a = authed(app, await token(app));
    await a.post().send({ puzzleDate: FUTURE, expression: 'x^2 - 4' });
    const dup = await a.post().send({ puzzleDate: FUTURE, expression: 'x - 1' });
    expect(dup.status).toBe(409);
  });

  it('rejects a malformed POST body with 400', async () => {
    const app = freshApp();
    const a = authed(app, await token(app));
    const res = await a.post().send({ puzzleDate: 'June 1st', expression: 'x - 1' });
    expect(res.status).toBe(400);
  });

  it('forbids editing or deleting a past date with 403', async () => {
    const app = freshApp();
    const a = authed(app, await token(app));
    const put = await a.put(PAST).send({ puzzleDate: PAST, expression: 'x - 1' });
    expect(put.status).toBe(403);
    const del = await a.del(PAST);
    expect(del.status).toBe(403);
  });

  it('updates then deletes a future puzzle', async () => {
    const app = freshApp();
    const a = authed(app, await token(app));
    await a.post().send({ puzzleDate: FUTURE, expression: 'x^2 - 4' });
    const put = await a.put(FUTURE).send({ puzzleDate: FUTURE, expression: 'x - 1', note: 'changed' });
    expect(put.status).toBe(200);
    const del = await a.del(FUTURE);
    expect(del.status).toBe(200);
  });

  it('rejects an invalid expression on PUT with 400', async () => {
    const app = freshApp();
    const a = authed(app, await token(app));
    await a.post().send({ puzzleDate: FUTURE, expression: 'x^2 - 4' });
    const res = await a.put(FUTURE).send({ puzzleDate: FUTURE, expression: 'x^4' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/rule|degree|polynomial/i);
  });

  it('404s a PUT for a future date with no scheduled puzzle', async () => {
    const app = freshApp();
    const a = authed(app, await token(app));
    const res = await a.put(FUTURE).send({ puzzleDate: FUTURE, expression: 'x - 1' });
    expect(res.status).toBe(404);
  });

  it('rejects a past-dated POST with 400 and a malformed PUT body with 400', async () => {
    const app = freshApp();
    const a = authed(app, await token(app));
    const past = await a.post().send({ puzzleDate: PAST, expression: 'x - 1' });
    expect(past.status).toBe(400);
    const bad = await a.put(FUTURE).send({ expression: '' });
    expect(bad.status).toBe(400);
  });

  it('filters the list by from/to date range', async () => {
    const app = freshApp();
    const a = authed(app, await token(app));
    await a.post().send({ puzzleDate: '2999-01-01', expression: 'x - 1' });
    await a.post().send({ puzzleDate: '2999-02-01', expression: 'x + 1' });
    await a.post().send({ puzzleDate: '2999-03-01', expression: 'x^2 - 4' });

    const ranged = await request(app)
      .get('/api/admin/puzzles')
      .query({ from: '2999-01-15', to: '2999-02-15' })
      .set('Authorization', `Bearer ${await token(app)}`);
    expect(ranged.status).toBe(200);
    expect(ranged.body).toHaveLength(1);
    expect(ranged.body[0].puzzleDate).toBe('2999-02-01');

    const badQuery = await request(app)
      .get('/api/admin/puzzles')
      .query({ from: 'not-a-date' })
      .set('Authorization', `Bearer ${await token(app)}`);
    expect(badQuery.status).toBe(400);
  });

  it('requires a token for puzzle management', async () => {
    const res = await request(freshApp())
      .post('/api/admin/puzzles')
      .send({ puzzleDate: FUTURE, expression: 'x - 1' });
    expect(res.status).toBe(401);
  });
});
