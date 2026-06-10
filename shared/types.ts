/**
 * Funcle shared domain model — the single source of truth for types used by
 * both the backend and the frontend (spec §2, §4, §8, §9).
 *
 * Enum-like unions are defined once as `as const` tuples so they can drive
 * both the TypeScript types here and the zod enums in `schemas.ts`, keeping
 * runtime validation and compile-time types in lockstep.
 */

/** Total turns a player gets per game (spec §4.2). */
export const TOTAL_TURNS = 6;

/** The three player commands (spec §4.3). */
export const COMMANDS = ['val', 'is_inc', 'target'] as const;
export type Command = (typeof COMMANDS)[number];

/** Overall game state (spec §4.2, §9 sessions.status). */
export const GAME_STATUSES = ['active', 'won', 'lost'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

/** Result of an `is_inc` command (spec §4.3, §13 Q3). */
export const IS_INC_RESULTS = ['Increasing', 'Decreasing', 'Stationary'] as const;
export type IsIncResult = (typeof IS_INC_RESULTS)[number];

/** Game mode (spec §3, §9 sessions.mode). */
export const GAME_MODES = ['daily', 'freeplay'] as const;
export type GameMode = (typeof GAME_MODES)[number];

/** How a daily puzzle row was authored (spec §3.3, §9 daily_puzzles.source). */
export const PUZZLE_SOURCES = ['curated', 'generated'] as const;
export type PuzzleSource = (typeof PUZZLE_SOURCES)[number];

/**
 * A polynomial's integer coefficients, highest degree first.
 * e.g. `[1, 0, -4]` represents x² − 4 (spec §4.1).
 * Stored only on the backend; never sent to the client during play.
 */
export type Coefficients = number[];

/** A single recorded move in a session's history (spec §9 moves, §8 /daily). */
export interface MoveRecord {
  turnNumber: number;
  command: Command;
  /** Present for `val` / `is_inc`; null for `target`. */
  inputX: number | null;
  /** Present for `target`; null otherwise. */
  expression: string | null;
  /** Result stored as a string for all command types. */
  result: string;
}

// --- Response shapes (outbound; produced by the backend, consumed by the UI) ---

export interface NewSessionResponse {
  sessionId: string;
  turnsRemaining: number;
}

export interface DailyResponse {
  sessionId: string;
  turnsRemaining: number;
  puzzleNumber: number;
  history: MoveRecord[];
  /** Revealed only when the resumed game is already won/lost (end-screen redisplay). */
  secret?: string;
  /** Secret coefficients for the end-game graph (§7.4); present with `secret`. */
  secretCoeffs?: Coefficients;
}

/** `result` is the numeric value, or the literal `'error'` for invalid x (spec §8). */
export interface ValResponse {
  result: number | 'error';
  turnsRemaining: number;
  gameStatus: GameStatus;
  /** Revealed only if this command exhausted the last turn (game now lost). */
  secret?: string;
  /** Secret coefficients for the end-game graph (§7.4); present with `secret`. */
  secretCoeffs?: Coefficients;
}

export interface IsIncResponse {
  result: IsIncResult | 'error';
  turnsRemaining: number;
  gameStatus: GameStatus;
  /** Revealed only if this command exhausted the last turn (game now lost). */
  secret?: string;
  /** Secret coefficients for the end-game graph (§7.4); present with `secret`. */
  secretCoeffs?: Coefficients;
}

/** A correct guess: the secret is revealed only now (spec §8 /game/target). */
export interface TargetWinResponse {
  correct: true;
  gameStatus: 'won';
  turnsUsed: number;
  secret: string;
  /** Secret coefficients for the end-game graph (§7.4). */
  secretCoeffs: Coefficients;
}

/** A wrong guess: secret revealed only when the game is now `lost`. */
export interface TargetWrongResponse {
  correct: false;
  gameStatus: 'active' | 'lost';
  turnsRemaining: number;
  /** Present only when the game just ended in a loss. */
  secret?: string;
  /** Present with `secret` when the game just ended in a loss (§7.4 graph). */
  secretCoeffs?: Coefficients;
}

export type TargetResponse = TargetWinResponse | TargetWrongResponse;

export interface StatsResponse {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  /** Keyed by turns-to-win "1".."6". */
  winDistribution: Record<string, number>;
}

export interface AuthResponse {
  userId: string;
  username: string;
}

export interface AdminLoginResponse {
  token: string;
}

/** A scheduled puzzle as returned by the admin list endpoint (spec §8). */
export interface AdminPuzzleSummary {
  puzzleDate: string;
  puzzleNumber: number;
  expression: string;
  note: string | null;
  source: PuzzleSource;
}
