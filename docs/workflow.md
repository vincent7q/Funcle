# Funcle Implementation Workflow

> **What this file is:** the project-level roadmap — the whole build broken into phases and tasks. It is the map, not the turn-by-turn directions.
>
> **How to use it:** pick the next unblocked task, then generate a detailed **test-first plan for that one task** (via the `superpowers:writing-plans` skill) and implement it with a review checkpoint (`superpowers:subagent-driven-development` or `superpowers:executing-plans`). Do **not** try to build multiple tasks at once.
>
> **Source of truth:** `docs/specifications.md`. Section references like “§4.3” point there. Math rules are confirmed in §13.

**Goal:** A web-based, turn-based polynomial-deduction game ("Function Wordle") with a daily curated puzzle, free play, stats, and a password-protected admin page for scheduling puzzles.

**Tech stack:** TypeScript everywhere. Backend: Node + Express + better-sqlite3 + mathjs + zod. Frontend: Vue 3 + Vite + Pinia + Tailwind + Chart.js. Tests: Vitest. (See §2.)

**Working method:** TDD for all logic (tests before implementation), DRY, YAGNI, frequent commits. (Implementation is on the `feat/scaffold` branch in the main working tree — no separate worktree was used.)

---

## Status (updated 2026-06-10)

**Playable end-to-end with the full end-of-game experience** (Vue UI → Vite proxy → Express → SQLite → math engine): Free Play + Daily, win/lose overlay, Chart.js graph reveal, and Wordle-style share. Anti-cheat invariants enforced (the secret never leaves the backend until the game ends). The daily-puzzle **admin** (`/admin`) is complete (bcrypt+JWT login, rate-limited, puzzle CRUD with §13 validation, future-only editing), and so are **accounts, stats, and the Help/Stats/Settings overlays** (optional login, per-identity stats with streaks + distribution, show-graph toggle). Backend: **126 Vitest tests, 98%+ statement coverage** (routes, db, engine at 100%). Frontend: **68 Vitest tests, ~88% statement coverage** on app logic (gameStore 100%). `tsc`/`vue-tsc` + ESLint clean on both; both build. **Deployment-ready**: single-origin static serving (`STATIC_DIR`), multi-stage `Dockerfile` + `docker-compose.yml` with a persistent `/data` volume for SQLite.

| Task | Status | Commit |
|------|--------|--------|
| 0.1 Scaffold backend + frontend + tooling | ✅ | `5c29bdc` |
| 0.2 Shared domain types + zod schemas (`shared/`) | ✅ | `0d1c4b2` |
| 1.1 SQLite DB layer (schema + `openDb`) | ✅ | `df3a800` |
| 1.2 Express skeleton + route stubs | ✅ | `2f7df90` |
| 2.1 `polynomial.ts` (evaluate, generate, formatPolynomial) | ✅ | `095d610` / `0c61b22` |
| 2.2 `derivative.ts` (`is_inc` direction) | ✅ | `8745de9` |
| 2.3 `parser.ts` (safe parse + sampling equivalence) | ✅ | `579a1ca` |
| 3.1 `POST /session/new` + `GET /daily` | ✅ | `3f05a5c` |
| 3.2 Game commands (`val` / `is_inc` / `target`) | ✅ | `0c61b22` |
| 3.3 Boundary validation (zod on all request bodies) | ✅ | (with 6.2) |
| 4.1 Static game screen + Tailwind | ✅ | `ccb954d` |
| 4.2 Game store + API client + free-play loop | ✅ | `b33e933` |
| 4.3 Daily mode load/resume (UI) | ✅ | `287e082` |
| 5.1 Win/lose overlay screen | ✅ | `97ac623` |
| 5.2 End-game graph (Chart.js) + settings store | ✅ | `5b60326` |
| 5.3 Share feature (emoji grid) | ✅ | `f29a1a6` |
| 6.1 Admin auth (bcrypt + JWT + rate limit) | ✅ | `6ea14b6` |
| 6.2 Admin puzzle CRUD + expression validation | ✅ | `159aa42` |
| 6.3 Admin page UI (`/admin`) | ✅ | `3b96b05` |
| 7.1 Optional accounts (bcrypt) | ✅ | `a3e031c` |
| 7.2 Stats tracking + `/stats/:userId` | ✅ | `74edb81` |
| 7.3 Help / Stats / Settings overlays | ✅ | `df043a2` |
| 8.1 Responsive & touch pass (CSS) | ✅ | (this commit) |
| 8.2 Test & coverage sweep | ✅ | (this commit) |
| 8.3 Deployment (single-origin + Docker) | ✅ | (this commit) |

**3.3 note:** session + game routes already validate via zod (400 on bad bodies; `val`/`is_inc` return `"error"` for invalid `x` per §13 Q4). Finish 3.3 (admin/stats validation + 400 tests) when those routes are implemented in Phases 6/7.

**8.2 note:** coverage measured with `@vitest/coverage-v8` (pinned to v2 to match Vitest 2). Backend: 126 tests, 98%+ statements — every route, db, and engine module at 100%; only the `server.ts` listen block and `config.ts` env fallbacks are uncovered (not unit-testable in-process). Frontend: 68 tests covering the stores (gameStore 100%, incl. the daily-resume secret reveal and Number-from-`<input type=number>` regressions), the API client, `ValueInput`, and all game components; pure bootstrap files (`main.ts`, `App.vue`, router, build configs) are excluded from coverage in `frontend/vitest.config.ts`.

**8.3 note:** `createApp` accepts an optional `staticDir` — set `STATIC_DIR` to the built `frontend/dist` to serve the SPA and API from one origin (verified locally: `npm run build` in both packages, then `node dist/backend/server.js` served `/`, `/admin` fallback, and `/api/*`; covered by supertest tests). A multi-stage `Dockerfile` (node:20-slim for better-sqlite3 prebuilds) builds both packages and runs the compiled server with `DB_PATH=/data/funcle.db` on a persistent volume; `docker-compose.yml` is the deploy reference (requires `JWT_SECRET` + `ADMIN_PASSWORD` bcrypt hash at runtime — never baked into the image). The Docker image itself has **not** been build-tested on this machine (Docker not installed) — verify `docker compose up --build` on the deploy host. Remaining manual items: on-device phone/iPad check (8.1 acceptance) and the actual deploy to a container host.

**To run locally:** `cd backend && npm run dev` (port 3000) + `cd frontend && npm run dev` (Vite proxies `/api` → 3000). Production-style: build both, then run the backend with `STATIC_DIR=../frontend/dist`.

**Environment note:** frontend is pinned to a Vite 6 / Vitest 2 stack because the dev machine runs Node 20.17 (the current Vite 8/rolldown toolchain needs ≥20.19). See `CLAUDE.md` and project memory before bumping frontend deps. Branch `feat/scaffold` is **not yet pushed** to origin.

---

## Dependency overview

```
Phase 0 (setup) ─► Phase 1 (backend foundation) ─► Phase 2 (math engine) ─► Phase 3 (game API)
                                                                                  │
Phase 4 (game UI) ◄───────────────────────────────────────────────────────────┘
   │
   ├─► Phase 5 (end-of-game: win screen, graph, share)
   ├─► Phase 6 (daily pipeline + admin)   ← can start once Phase 3 exists
   └─► Phase 7 (users + stats + secondary screens)
                                                  │
                                          Phase 8 (responsive, tests, deploy)
```

The math engine (Phase 2) is the critical path and the highest-value place for TDD. The frontend static scaffold (Phase 4.1) has no backend dependency and can be built in parallel with Phases 1–3.

---

## Phase 0 — Project setup & tooling

### Task 0.1 — Scaffold repo, both apps, and tooling
**Implements:** §2, §12 · **Depends on:** —
- Create `backend/` (Node + Express + TypeScript) and `frontend/` (`npm create vue@latest` → TypeScript + Pinia + Vue Router).
- Configure: `tsconfig.json` with `strict: true`; ESLint + Prettier; Vitest in both packages; `.gitignore`; `.env.example` (`ADMIN_PASSWORD`, JWT secret, DB path — names only).
- Backend scripts: `dev` (`tsx watch`), `build` (`tsc`), `test` (`vitest`).
**Acceptance:** both apps start (`hello world` route + default Vue page); `npm test` runs an empty suite; lint passes.

### Task 0.2 — Shared domain types & zod schemas
**Implements:** §2 (type-safety note), §4, §8 · **Depends on:** 0.1
- Define the domain model once: `Coefficients` (number[], highest-degree-first), `Command` (`'val'|'is_inc'|'target'`), `GameStatus`, `IsIncResult` (`'Increasing'|'Decreasing'|'Stationary'`).
- Define zod schemas for every API request/response body (§8); derive TS types via `z.infer`.
**Acceptance:** schemas compile; a sample parse of a valid/invalid body passes/fails as expected in a unit test.

---

## Phase 1 — Backend foundation

### Task 1.1 — Database layer
**Implements:** §9 · **Depends on:** 0.1
- `backend/db/schema.sql`: all tables — `daily_puzzles` (with `source`, `note`, `created_at`), `sessions`, `moves`, `users`, `user_stats`.
- `backend/db/db.ts`: open SQLite, run schema on init (idempotent), expose typed query helpers.
**Acceptance:** a test opens a temp DB, initializes the schema, inserts + reads a `daily_puzzles` row.

### Task 1.2 — Express server skeleton + middleware + route stubs
**Implements:** §8, §11 · **Depends on:** 1.1
- `backend/server.ts`: mount cors, JSON parser, central error handler.
- Stub routers (`sessionRoute`, `gameRoute`, `statsRoute`, `adminRoute`) returning placeholder responses.
**Acceptance:** all §8 routes respond with stub payloads; a test hits `/api/session/new` and gets a 200.

---

## Phase 2 — Math engine (pure logic, strict TDD)

> No I/O. Each function is tested first against the confirmed rules in §13. This is the part to get bullet-proof.

### Task 2.1 — `polynomial.ts`: generation + evaluation
**Implements:** §4.1, §13 Q1/Q2, §3.3 fallback · **Depends on:** 0.2
- `evaluate(coeffs, x)`; `generateRandom()` (degree 1–3, integer coeffs −10..10, non-zero leading); `generateFromDate(date)` (deterministic seeded RNG → same puzzle for a date).
**Acceptance tests:** evaluation correctness; generation always within bounds; `generateFromDate` is deterministic (same date → same coeffs); leading coefficient never 0.

### Task 2.2 — `derivative.ts`: slope direction
**Implements:** §4.3 `is_inc`, §13 Q3 · **Depends on:** 2.1
- `derivativeCoeffs(coeffs)`; `evaluateDirection(coeffs, x)` → `'Increasing'|'Decreasing'|'Stationary'`.
**Acceptance tests:** correct sign for sampled cubics/quadratics; returns `'Stationary'` exactly when `f'(x)=0` (e.g. `x²` at `x=0`).

### Task 2.3 — `parser.ts`: safe parse + sampling-based equivalence
**Implements:** §4.3 `target`, §13 Q5 · **Depends on:** 2.1
- Parse with mathjs restricted to variable `x` + operators (reject other symbols/function calls; never `math.evaluate` raw).
- `isEquivalent(guessExpr, secretCoeffs)` via numeric sampling at ~8 distinct points (incl. non-integers), accept within epsilon.
**Acceptance tests:** accepts `x^2-4`, `-4+x^2`, `(x-2)(x+2)` for secret `[1,0,-4]`; rejects `x^2-3` and near-misses; rejects malicious/non-`x` input.

---

## Phase 3 — Game API

### Task 3.1 — Session creation & daily resolution
**Implements:** §8 (`/session/new`, `/daily`), §3.1/§3.3 · **Depends on:** 1.2, 2.1
- `POST /api/session/new` (free play: generate secret, store, return sessionId — **never** the secret).
- `GET /api/daily`: serve today's curated puzzle; if none, `generateFromDate`, persist as `source='generated'`, serve; resume if already played.
**Acceptance tests:** new session has 6 turns and no secret in the response; daily with no curated row auto-generates and is identical on a second call same day.

### Task 3.2 — Game command endpoints
**Implements:** §4.2/§4.3, §8 (`/game/val`, `/is_inc`, `/target`) · **Depends on:** 3.1, 2.2, 2.3
- Each valid command consumes 1 turn, persists a `moves` row; invalid `x` returns `"error"` **without** consuming a turn.
- `target`: equivalence check → `won`; else consume turn → `active`/`lost`. On win/lose, reveal `secret`.
**Acceptance tests:** turn accounting; invalid input keeps turns; secret leaks only on game end; win/lose transitions correct.

### Task 3.3 — Boundary validation
**Implements:** §2.1 · **Depends on:** 3.1, 3.2
- Wrap every route body in its zod schema (Phase 0.2); reject with `400`.
**Acceptance tests:** malformed bodies return 400 with a useful message.

---

## Phase 4 — Frontend game screen

### Task 4.1 — Static main game screen (blueprint)
**Implements:** §7.1–§7.6 · **Depends on:** 0.1 (parallel with Phases 1–3)
- Build per `design/funcle_ui_blueprint.html`: `AppHeader`, `GameGrid`, `GameRow` (with `state-val/state-inc/state-empty/awaiting` states), `CommandSelector`, `ValueInput`, `SubmitButton`. Tailwind tokens from §7.2 (incl. `--color-card`). No graph.
**Acceptance:** renders with hardcoded rows matching the blueprint on mobile width; component tests for `GameRow` state rendering.

### Task 4.2 — Game store + API client + free-play loop
**Implements:** §10 (`gameStore`), §8 · **Depends on:** 4.1, 3.2
- `fetch` API client; `gameStore` (sessionId, history, turnsRemaining, gameStatus, mode, secret, discoveredPoints).
- Wire submit → call endpoint → append immutable row → update turns/status.
**Acceptance:** a full free-play game is playable end-to-end against the real backend; win and lose both reachable.

### Task 4.3 — Daily mode load/resume
**Implements:** §3.1, §8 (`/daily`) · **Depends on:** 4.2, 3.1
- On load, fetch daily; render prior history if already played.
**Acceptance:** daily puzzle loads; replaying same day resumes state.

---

## Phase 5 — End-of-game experience

### Task 5.1 — Win/Lose screen
**Implements:** §7 (WinScreen) · **Depends on:** 4.2
- `WinScreen.vue` overlay: result, turns used, the revealed secret.
**Acceptance:** appears on `won`/`lost`; shows correct secret.

### Task 5.2 — End-of-game graph + settings
**Implements:** §7.4, §10 (`PolynomialChart`, `settingsStore`) · **Depends on:** 5.1
- `PolynomialChart.vue`: plot revealed `secret` + discovered `val` points; render only at game end. `settingsStore` with `showGraph` (default on, `localStorage`).
**Acceptance:** graph shows on game end when enabled, hidden when toggled off; responsive sizing.

### Task 5.3 — Share feature
**Implements:** §6 · **Depends on:** 5.1
- Build the emoji grid (🟩 val / 🟨 is_inc / 🎯 target, ✅/❌, puzzle number or "Free Play"); copy to clipboard. No x-values/results leaked.
**Acceptance:** clipboard text matches the §6 format for sample games.

---

## Phase 6 — Daily puzzle pipeline & admin

### Task 6.1 — Admin auth
**Implements:** §3.3, §8 (`/admin/login`), §9 note · **Depends on:** 1.2
- `POST /api/admin/login`: compare against `ADMIN_PASSWORD` (bcrypt hash) → signed JWT. `adminAuth.ts` middleware. `express-rate-limit` on login.
**Acceptance tests:** correct password → token; wrong → 401; repeated attempts → 429; protected route rejects missing/invalid token.

### Task 6.2 — Admin puzzle CRUD
**Implements:** §3.3, §8 (`/admin/puzzles`) · **Depends on:** 6.1, 2.1
- GET (list, date range), POST (parse+validate expression → coeffs via §13 rules, store `source='curated'`), PUT/DELETE (future dates only; 403 for today/past).
**Acceptance tests:** valid expression scheduled; invalid rejected with reason; past-date edit forbidden; duplicate date → 409.

### Task 6.3 — Admin page UI
**Implements:** §3.3, §10 (`AdminView`, `adminStore`) · **Depends on:** 6.2
- `/admin` route: password login, upcoming-dates table, add/edit form (expression + optional note), future-only editing.
**Acceptance:** can log in and schedule a puzzle for a future date; not linked from the game UI.

---

## Phase 7 — Users, stats & secondary screens

### Task 7.1 — Optional accounts
**Implements:** §5 · **Depends on:** 1.1
- Register/login (bcrypt), anonymous browser UUID in `localStorage`.
**Acceptance tests:** register stores a bcrypt hash; login verifies; anonymous flow works without an account.

### Task 7.2 — Stats tracking + endpoint
**Implements:** §5.2, §8 (`/stats/:userId`) · **Depends on:** 3.2, 7.1
- Update `user_stats` on game end (games played/won, streaks, win distribution). `GET /api/stats/:userId`.
**Acceptance tests:** streak increments on consecutive wins, resets on loss; distribution buckets correctly.

### Task 7.3 — Stats / Help / Settings screens
**Implements:** §7.7, §10 · **Depends on:** 7.2, 5.2
- `StatsModal` (numbers + distribution chart), `HelpModal` (how-to-play), `SettingsModal` (show-graph toggle). Reached from header icons.
**Acceptance:** each opens from the header; Stats shows live data; Settings toggles the graph.

---

## Phase 8 — Responsiveness, full test pass & deployment

### Task 8.1 — Responsive & touch pass
**Implements:** §7.7 · **Depends on:** Phases 4–7 UI
- Verify mobile + iPad (portrait/landscape), ~44px touch targets, fluid graph.
**Acceptance:** manual + viewport tests pass on phone and tablet widths.

### Task 8.2 — Test & coverage sweep
**Implements:** §2.1 · **Depends on:** all
- Fill gaps: engine coverage high; route tests for turn accounting + secret-never-leaks; key component tests.
**Acceptance:** suite green; engine coverage ≥ target.

### Task 8.3 — Deployment
**Implements:** §15 · **Depends on:** all
- Container build (frontend `vite build` static, backend `tsc` → `dist/`); persistent volume for SQLite; env/secrets; optional single-origin serving (drop cors). Backup of the DB file.
**Acceptance:** deploys to a container host with data persisting across restarts.

---

## Suggested first slice (vertical proof)

To de-risk early, the first end-to-end slice worth targeting: **0.1 → 0.2 → 1.1 → 1.2 → 2.1 → 2.2 → 2.3 → 3.1 → 3.2 → 4.1 → 4.2.** That yields a fully playable Free Play game with the real math engine — the heart of Funcle — before layering daily/admin/stats on top.
