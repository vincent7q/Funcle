import { describe, it, expect, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { openDb } from './db';

const base = join(tmpdir(), `funcle-test-${randomUUID()}`);
const dbPath = `${base}.db`;

afterAll(() => {
  for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    rmSync(f, { force: true });
  }
});

describe('database layer', () => {
  it('initializes the schema and round-trips a daily_puzzles row', () => {
    const db = openDb(dbPath);
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO daily_puzzles (puzzle_date, puzzle_number, coefficients, source, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('2026-06-10', 43, '[1,0,-4]', 'curated', 'intro quadratic', now);

    const row = db.prepare(`SELECT * FROM daily_puzzles WHERE puzzle_date = ?`).get('2026-06-10');
    expect(row).toMatchObject({
      puzzle_date: '2026-06-10',
      puzzle_number: 43,
      coefficients: '[1,0,-4]',
      source: 'curated',
      note: 'intro quadratic',
    });

    db.close();
  });

  it('re-running schema init is idempotent and preserves existing data', () => {
    // Reopen the same file: openDb runs schema.sql again (CREATE TABLE IF NOT EXISTS)
    // and must not throw, while the previously inserted row survives.
    const db = openDb(dbPath);
    const row = db.prepare(`SELECT puzzle_number FROM daily_puzzles WHERE puzzle_date = ?`).get(
      '2026-06-10',
    ) as { puzzle_number: number } | undefined;
    expect(row?.puzzle_number).toBe(43);
    db.close();
  });

  it('creates all five tables from the schema', () => {
    const db = openDb(':memory:');
    const names = (
      db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
        .all() as { name: string }[]
    ).map((r) => r.name);
    expect(names).toEqual(
      expect.arrayContaining(['daily_puzzles', 'sessions', 'moves', 'users', 'user_stats']),
    );
    db.close();
  });

  it('enforces foreign keys (pragma on)', () => {
    const db = openDb(':memory:');
    const fk = db.pragma('foreign_keys', { simple: true });
    expect(fk).toBe(1);
    db.close();
  });
});
