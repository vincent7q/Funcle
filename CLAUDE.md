# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current State

This is a **pre-implementation (greenfield) project**. The repository currently contains only documentation and design assets — there is **no source code, `package.json`, build, lint, or test tooling yet**. The first coding work will be scaffolding the `backend/` and `frontend/` apps described below.

`docs/specifications.md` is the **single source of truth** for the build. Read it fully before writing code. The planned folder structure, API contracts, DB schema, component map, and engine map all live there.

## What Funcle Is

A web-based, turn-based math deduction puzzle ("Function Wordle"). The player has **6 turns** to identify a secret integer-coefficient polynomial `f(x)` using three commands:
- `val x` → returns `f(x)` (green 🟩)
- `is_inc x` → returns `Increasing` / `Decreasing` / `Stationary` based on `f'(x)` (yellow 🟨)
- `target [expression]` → guess the polynomial; symbolic-equivalence match wins (🎯)

## Planned Tech Stack (confirmed in spec §2)

- **Language:** **TypeScript** (`strict` mode). Backend runs via `tsx` in dev and compiles with `tsc` → `dist/` for prod; frontend builds type-check with `vue-tsc`. Define shared API-contract and domain types (coefficient array, `gameStatus`, `command` unions) once so front and back stay in sync.
- **Frontend:** Vue 3 + Vite (SPA), Tailwind CSS (dark mode), Pinia, Chart.js via `vue-chartjs`, `mathjs`. HTTP via native `fetch` (no axios).
- **Backend:** Node.js + Express, `better-sqlite3` (single-file SQLite, synchronous API), `mathjs`, `cors`, `uuid`, `bcrypt` (password hashing), `jsonwebtoken` (tokens), `zod` (validate every request body — derive types via `z.infer`), `express-rate-limit` (throttle admin login), `dotenv`
- **Testing/quality:** `vitest` (+ `@vue/test-utils`), `eslint`, `prettier`. Engine modules (`polynomial`, `derivative`, `parser`) are pure and must have unit tests covering the §13 rules. See spec §2.1.
- **Deployment:** container/VPS with a **persistent disk** (Fly.io/Railway/Render/VPS) — *not* edge/serverless: `better-sqlite3` is a native module and SQLite needs persistent storage. See spec §15.

## Resolved Math Rules (formerly the blocking PENDING questions)

The five math-validation questions that once blocked the engine are now **confirmed** and recorded in `docs/specifications.md` §13 (originally answered by the mathematician in `docs/proposal/project_proposal.md` §5). The rules:

- **Q1 — Max degree:** 3 (polynomials are degree 1–3)
- **Q2 — Coefficient range:** integers from −10 to +10 (leading coefficient may be negative)
- **Q3 — `is_inc` at `f'(x) = 0`:** return `"Stationary"`
- **Q4 — `x` input domain:** decimals and integers both allowed; invalid input returns `"error"` and prompts the player to retry
- **Q5 — `target` equivalence:** accept reordered (`-4 + x^2`) and factored (`(x-2)(x+2)`) forms. Decide equivalence by **numeric sampling** — evaluate guess and secret at ~8 distinct points (incl. non-integers), accept if all match within epsilon. Use `mathjs` only to *parse* (restricted to `x` + operators; never `math.evaluate` on raw input). More robust than symbolic simplification. See spec §4.3.

The spec asks that these answers be recorded in `math/rules/math_rules.md` once confirmed — do this when creating the `math/` directory.

## Critical Implementation Constraints

These are anti-cheat and correctness invariants from the spec — do not violate them:

- **The secret polynomial must never leave the backend** during active play. It is stored only in the DB (as a JSON coefficient array, highest degree first, e.g. `[1,0,-4]` = `x² − 4`) and is only included in an API response on win/loss (the `secret` field of the `target` response).
- **The polynomial graph (`PolynomialChart.vue`) renders the full curve only after the game ends.** During play it shows only discovered `val` points as scatter dots — drawing the curve early would give away the answer.
- **History grid rows are immutable** once filled.
- **Daily mode** serves the same polynomial to all players for a given calendar date. Puzzles come from a **curated bank** authored ahead of time via a password-protected admin page (`/admin`, gated by the `ADMIN_PASSWORD` env var — a single operator credential, not a player account); if no puzzle is scheduled for a date, the backend **deterministically generates** one from the date as a fallback (`source='generated'`). See spec §3.3 and the `/api/admin/*` routes in §8. **Free Play** generates a new random polynomial per session. Stats are tracked separately per mode.

## Build Order (spec §14)

The spec prescribes this sequence to unblock work early: DB schema + `db.js` → Express server + route stubs → frontend scaffold (static UI) → Pinia store + API wiring → Chart.js panel with mock data → math engine (`polynomial.js`, `derivative.js`, `parser.js`) → full game-loop integration → auth/stats → share feature → tests.

The math engine in `backend/engine/` is pure logic (no DB/HTTP) and should be unit-tested — write engine tests once the engine files exist.

## Design Reference

`design/funcle_ui_blueprint.html` is a high-fidelity HTML mockup of the target UI; `design/convert_css.txt` and `design/assets/` hold palette/style references. Use these plus the dark-theme color tokens in spec §7.2 when building Vue components.
