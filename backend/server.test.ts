import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './server';
import { openDb } from './db/db';
import { getAdminConfig } from './config';

describe('backend smoke test', () => {
  it('responds 200 with status ok on GET /api/health', async () => {
    const app = createApp(openDb(':memory:'));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'funcle-backend' });
  });

  it('returns JSON (never HTML) from the central error handler on malformed JSON', async () => {
    const app = createApp(openDb(':memory:'));
    const res = await request(app)
      .post('/api/session/new')
      .set('Content-Type', 'application/json')
      .send('{not json');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('single-origin static serving (spec §15)', () => {
  let staticDir: string;

  beforeAll(() => {
    staticDir = mkdtempSync(join(tmpdir(), 'funcle-static-'));
    writeFileSync(join(staticDir, 'index.html'), '<!doctype html><title>Funcle</title>');
  });

  afterAll(() => {
    rmSync(staticDir, { recursive: true, force: true });
  });

  it('serves index.html at the root', async () => {
    const app = createApp(openDb(':memory:'), getAdminConfig(), staticDir);
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Funcle');
  });

  it('falls back to index.html for SPA routes like /admin', async () => {
    const app = createApp(openDb(':memory:'), getAdminConfig(), staticDir);
    const res = await request(app).get('/admin');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Funcle');
  });

  it('still serves the API and 404s unknown API paths as JSON, not HTML', async () => {
    const app = createApp(openDb(':memory:'), getAdminConfig(), staticDir);
    const health = await request(app).get('/api/health');
    expect(health.body.status).toBe('ok');
    const missing = await request(app).get('/api/nope');
    expect(missing.status).toBe(404);
    expect(missing.text).not.toContain('<!doctype');
  });
});
