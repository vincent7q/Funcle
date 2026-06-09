-- Funcle database schema (SQLite) — source of truth for DB structure (spec §9).
-- All statements use IF NOT EXISTS so initialization is idempotent.

-- One polynomial per calendar day. Written by the admin page (source='curated')
-- or by the deterministic fallback generator (source='generated'). (§3.3)
CREATE TABLE IF NOT EXISTS daily_puzzles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  puzzle_date   TEXT NOT NULL UNIQUE,                -- ISO date, e.g. '2026-06-10'
  puzzle_number INTEGER NOT NULL,
  coefficients  TEXT NOT NULL,                       -- JSON array, e.g. '[1,0,-4]' = x^2 - 4
  source        TEXT NOT NULL DEFAULT 'curated',     -- 'curated' | 'generated'
  note          TEXT,                                -- optional private author label
  created_at    TEXT NOT NULL                        -- ISO datetime
);

-- One row per game session (daily and free play).
CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,                     -- UUID
  mode         TEXT NOT NULL,                        -- 'daily' | 'freeplay'
  user_id      TEXT,                                 -- NULL for anonymous
  puzzle_date  TEXT,                                 -- NULL for freeplay
  coefficients TEXT NOT NULL,                        -- JSON array, secret polynomial
  status       TEXT NOT NULL DEFAULT 'active',       -- 'active' | 'won' | 'lost'
  turns_used   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL                         -- ISO datetime
);

-- Full move history per session.
CREATE TABLE IF NOT EXISTS moves (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   TEXT NOT NULL REFERENCES sessions(id),
  turn_number  INTEGER NOT NULL,                     -- 1-6
  command      TEXT NOT NULL,                        -- 'val' | 'is_inc' | 'target'
  input_x      REAL,                                 -- NULL for 'target'
  expression   TEXT,                                 -- NULL for 'val' and 'is_inc'
  result       TEXT NOT NULL,                        -- stored as string for all types
  created_at   TEXT NOT NULL
);

-- Optional user accounts.
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,                    -- UUID
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,                       -- bcrypt hash, never plaintext
  created_at    TEXT NOT NULL
);

-- Aggregated stats per identity. Keyed by either an account id (users.id) or an
-- anonymous browser UUID, so anonymous play is tracked too (§5.2) — hence no FK.
CREATE TABLE IF NOT EXISTS user_stats (
  user_id          TEXT PRIMARY KEY,
  games_played     INTEGER NOT NULL DEFAULT 0,
  games_won        INTEGER NOT NULL DEFAULT 0,
  current_streak   INTEGER NOT NULL DEFAULT 0,
  max_streak       INTEGER NOT NULL DEFAULT 0,
  win_distribution TEXT NOT NULL DEFAULT '{}'        -- JSON: {"1":0,...,"6":0}
);

-- Helpful indexes for common lookups.
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_moves_session ON moves (session_id);
