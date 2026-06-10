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
  StatsResponse,
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

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
}

/** Create a user account; returns the generated UUID. */
export function createUser(db: Db, params: { username: string; passwordHash: string }): string {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)`,
  ).run(id, params.username, params.passwordHash, new Date().toISOString());
  return id;
}

export function getUserByUsername(db: Db, username: string): UserRow | undefined {
  return db.prepare(`SELECT * FROM users WHERE username = ?`).get(username) as UserRow | undefined;
}

interface UserStatsRow {
  user_id: string;
  games_played: number;
  games_won: number;
  current_streak: number;
  max_streak: number;
  win_distribution: string;
}

/** Read a player's aggregate stats (zeros if they have none yet). */
export function getStats(db: Db, userId: string): StatsResponse {
  const row = db.prepare(`SELECT * FROM user_stats WHERE user_id = ?`).get(userId) as
    | UserStatsRow
    | undefined;
  if (!row) {
    return { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, winDistribution: {} };
  }
  return {
    gamesPlayed: row.games_played,
    gamesWon: row.games_won,
    currentStreak: row.current_streak,
    maxStreak: row.max_streak,
    winDistribution: JSON.parse(row.win_distribution) as Record<string, number>,
  };
}

/**
 * Record a finished game for a player: increment games played/won, advance the
 * win streak on a win (reset to 0 on a loss), track the max streak, and bucket
 * the turn count into the win distribution (spec §5.2).
 */
export function recordGameResult(
  db: Db,
  userId: string,
  result: { won: boolean; turnsUsed: number },
): void {
  const row = db.prepare(`SELECT * FROM user_stats WHERE user_id = ?`).get(userId) as
    | UserStatsRow
    | undefined;

  const prev = row ?? {
    games_played: 0,
    games_won: 0,
    current_streak: 0,
    max_streak: 0,
    win_distribution: '{}',
  };
  const dist = JSON.parse(prev.win_distribution) as Record<string, number>;
  const currentStreak = result.won ? prev.current_streak + 1 : 0;
  const maxStreak = Math.max(prev.max_streak, currentStreak);
  if (result.won) {
    const key = String(result.turnsUsed);
    dist[key] = (dist[key] ?? 0) + 1;
  }

  db.prepare(
    `INSERT INTO user_stats (user_id, games_played, games_won, current_streak, max_streak, win_distribution)
     VALUES (@userId, @played, @won, @streak, @maxStreak, @dist)
     ON CONFLICT(user_id) DO UPDATE SET
       games_played = @played, games_won = @won, current_streak = @streak,
       max_streak = @maxStreak, win_distribution = @dist`,
  ).run({
    userId,
    played: prev.games_played + 1,
    won: prev.games_won + (result.won ? 1 : 0),
    streak: currentStreak,
    maxStreak,
    dist: JSON.stringify(dist),
  });
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
