import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  Coefficients,
  Command,
  GameMode,
  GameStatus,
  MoveRecord,
  PuzzleSource,
} from '../../shared/types';

export type Db = Database.Database;

/** Location of the canonical schema file (spec §9, §11). Lives beside this module. */
const SCHEMA_PATH = join(__dirname, 'schema.sql');

/**
 * Open (or create) the SQLite database at `path`, enable foreign keys + WAL,
 * and run the schema so initialization is idempotent. Pass `':memory:'` for
 * an ephemeral in-memory database (used by tests).
 *
 * better-sqlite3 is synchronous by design (spec §2), so no async here.
 */
export function openDb(path: string): Db {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

/** Run the schema DDL. Safe to call repeatedly (all statements use IF NOT EXISTS). */
export function initSchema(db: Db): void {
  const ddl = readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(ddl);
}

// --- Row types (DB column names; snake_case) ---

export interface SessionRow {
  id: string;
  mode: GameMode;
  user_id: string | null;
  puzzle_date: string | null;
  coefficients: string; // JSON array
  status: GameStatus;
  turns_used: number;
  created_at: string;
}

export interface DailyPuzzleRow {
  id: number;
  puzzle_date: string;
  puzzle_number: number;
  coefficients: string; // JSON array
  source: PuzzleSource;
  note: string | null;
  created_at: string;
}

// --- Query helpers (typed) ---

/** Insert a new active session; returns its generated UUID. */
export function createSession(
  db: Db,
  params: {
    mode: GameMode;
    userId: string | null;
    puzzleDate: string | null;
    coefficients: Coefficients;
  },
): string {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO sessions (id, mode, user_id, puzzle_date, coefficients, status, turns_used, created_at)
     VALUES (?, ?, ?, ?, ?, 'active', 0, ?)`,
  ).run(
    id,
    params.mode,
    params.userId,
    params.puzzleDate,
    JSON.stringify(params.coefficients),
    new Date().toISOString(),
  );
  return id;
}

export function getSession(db: Db, id: string): SessionRow | undefined {
  return db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as SessionRow | undefined;
}

/** The earliest daily session for a user on a given date (for resume). */
export function findDailySession(
  db: Db,
  userId: string,
  puzzleDate: string,
): SessionRow | undefined {
  return db
    .prepare(
      `SELECT * FROM sessions WHERE mode = 'daily' AND user_id = ? AND puzzle_date = ?
       ORDER BY created_at LIMIT 1`,
    )
    .get(userId, puzzleDate) as SessionRow | undefined;
}

/** Advance a session's status and turn count. */
export function updateSession(
  db: Db,
  id: string,
  fields: { status: GameStatus; turnsUsed: number },
): void {
  db.prepare(`UPDATE sessions SET status = ?, turns_used = ? WHERE id = ?`).run(
    fields.status,
    fields.turnsUsed,
    id,
  );
}

export function getDailyPuzzle(db: Db, date: string): DailyPuzzleRow | undefined {
  return db.prepare(`SELECT * FROM daily_puzzles WHERE puzzle_date = ?`).get(date) as
    | DailyPuzzleRow
    | undefined;
}

/** Next sequential puzzle number (max + 1, starting at 1). */
export function getNextPuzzleNumber(db: Db): number {
  const row = db.prepare(`SELECT MAX(puzzle_number) AS max FROM daily_puzzles`).get() as {
    max: number | null;
  };
  return (row.max ?? 0) + 1;
}

/** List puzzles, optionally bounded by an inclusive ISO date range. */
export function getPuzzlesInRange(db: Db, from?: string, to?: string): DailyPuzzleRow[] {
  let sql = `SELECT * FROM daily_puzzles`;
  const where: string[] = [];
  const args: string[] = [];
  if (from) {
    where.push(`puzzle_date >= ?`);
    args.push(from);
  }
  if (to) {
    where.push(`puzzle_date <= ?`);
    args.push(to);
  }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ` ORDER BY puzzle_date`;
  return db.prepare(sql).all(...args) as DailyPuzzleRow[];
}

export function updateDailyPuzzle(
  db: Db,
  date: string,
  fields: { coefficients: Coefficients; note: string | null },
): void {
  db.prepare(`UPDATE daily_puzzles SET coefficients = ?, note = ? WHERE puzzle_date = ?`).run(
    JSON.stringify(fields.coefficients),
    fields.note,
    date,
  );
}

export function deleteDailyPuzzle(db: Db, date: string): void {
  db.prepare(`DELETE FROM daily_puzzles WHERE puzzle_date = ?`).run(date);
}

export function insertDailyPuzzle(
  db: Db,
  params: {
    puzzleDate: string;
    puzzleNumber: number;
    coefficients: Coefficients;
    source: PuzzleSource;
    note: string | null;
  },
): DailyPuzzleRow {
  db.prepare(
    `INSERT INTO daily_puzzles (puzzle_date, puzzle_number, coefficients, source, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    params.puzzleDate,
    params.puzzleNumber,
    JSON.stringify(params.coefficients),
    params.source,
    params.note,
    new Date().toISOString(),
  );
  return getDailyPuzzle(db, params.puzzleDate)!;
}

/** Insert one move row for a session. */
export function insertMove(
  db: Db,
  params: {
    sessionId: string;
    turnNumber: number;
    command: Command;
    inputX: number | null;
    expression: string | null;
    result: string;
  },
): void {
  db.prepare(
    `INSERT INTO moves (session_id, turn_number, command, input_x, expression, result, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    params.sessionId,
    params.turnNumber,
    params.command,
    params.inputX,
    params.expression,
    params.result,
    new Date().toISOString(),
  );
}

/** All moves for a session, ordered by turn, mapped to the shared MoveRecord shape. */
export function getMoves(db: Db, sessionId: string): MoveRecord[] {
  const rows = db
    .prepare(
      `SELECT turn_number, command, input_x, expression, result FROM moves
       WHERE session_id = ? ORDER BY turn_number`,
    )
    .all(sessionId) as {
    turn_number: number;
    command: Command;
    input_x: number | null;
    expression: string | null;
    result: string;
  }[];
  return rows.map((r) => ({
    turnNumber: r.turn_number,
    command: r.command,
    inputX: r.input_x,
    expression: r.expression,
    result: r.result,
  }));
}
