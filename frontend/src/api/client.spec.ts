import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from './client';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe('api client', () => {
  it('POSTs JSON and returns the parsed body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ sessionId: 's1', turnsRemaining: 6 }));
    const res = await api.newSession(null);
    expect(res.sessionId).toBe('s1');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/session/new');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ userId: null });
  });

  it('encodes the userId query param for /daily', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ sessionId: 'd1', turnsRemaining: 6, puzzleNumber: 1, history: [] }),
    );
    await api.getDaily('a b');
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/daily?userId=a%20b');
  });

  it('throws the backend error message on a non-ok response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Session not found' }, false, 404));
    await expect(api.val('nope', 1)).rejects.toThrow('Session not found');
  });

  it('falls back to a status message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response);
    await expect(api.target('s1', 'x')).rejects.toThrow('Request failed (500)');
  });

  it('sends the admin token as a Bearer header', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await api.adminListPuzzles('tok123');
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers.Authorization).toBe('Bearer tok123');
  });
});
