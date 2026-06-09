import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './server';

describe('backend smoke test', () => {
  it('responds 200 with status ok on GET /api/health', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'funcle-backend' });
  });
});
