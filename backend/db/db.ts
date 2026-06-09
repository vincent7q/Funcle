import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
