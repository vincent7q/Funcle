import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../server';
import { openDb } from '../db/db';

function setup() {
  const db = openDb(':memory:');
  return { db, app: createApp(db) };
}

describe('POST /api/auth/register', () => {
  it('creates a user, stores a bcrypt hash (never plaintext), returns the userId', async () => {
    const { db, app } = setup();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', password: 'hunter2!' });
    expect(res.status).toBe(200);
    expect(typeof res.body.userId).toBe('string');
    expect(res.body.username).toBe('alice');

    const row = db
      .prepare('SELECT password_hash FROM users WHERE username = ?')
      .get('alice') as { password_hash: string };
    expect(row.password_hash).not.toBe('hunter2!');
    expect(row.password_hash.startsWith('$2')).toBe(true);
  });

  it('rejects a duplicate username with 409', async () => {
    const { app } = setup();
    await request(app).post('/api/auth/register').send({ username: 'bob', password: 'secret1' });
    const dup = await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', password: 'secret2' });
    expect(dup.status).toBe(409);
  });

  it('rejects too-short username or password with 400', async () => {
    const { app } = setup();
    const shortUser = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', password: 'longenough' });
    const shortPass = await request(app)
      .post('/api/auth/register')
      .send({ username: 'valid', password: 'short' });
    expect(shortUser.status).toBe(400);
    expect(shortPass.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('verifies the password and returns the same userId', async () => {
    const { app } = setup();
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'carol', password: 'pass1234' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'carol', password: 'pass1234' });
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(reg.body.userId);
  });

  it('rejects a wrong password with 401', async () => {
    const { app } = setup();
    await request(app).post('/api/auth/register').send({ username: 'dave', password: 'pass1234' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dave', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown user with 401', async () => {
    const { app } = setup();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'whatever' });
    expect(res.status).toBe(401);
  });
});
