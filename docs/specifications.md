# Funcle — Project Specification
## AI Development Reference Document
> **For AI developers**: This document is the single source of truth for building Funcle. Read it fully before writing any code. All previously open math-validation decisions are now **resolved** — the confirmed rules are recorded in Section 13 and baked into the relevant sections below.

---

## 1. Project Overview

**Funcle** ("Function Wordle") is a web-based, turn-based mathematical deduction puzzle. The player acts as a "Function Detective" trying to identify a secret polynomial function $f(x)$ within 6 moves by querying the function's values and derivative behavior.

**Collaborative structure:**
- **Mathematician (son):** Defines and validates all math rules. Has confirmed the rules recorded in Section 13.
- **IT Engineer (father):** Owns all software architecture, implementation, and deployment.

---

## 2. Confirmed Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | **Vue 3 + Vite** | SPA architecture |
| Styling | **Tailwind CSS** | Dark-mode utility classes |
| Graph/chart | **Chart.js** via `vue-chartjs` | Polynomial curve + discovered points |
| Math engine | **mathjs** | Symbolic parsing, derivative, expression equality |
| State management | **Pinia** | Vue 3 native store |
| Backend framework | **Node.js + Express.js** | REST API |
| Database | **SQLite** via `better-sqlite3` | Synchronous API, single file |
| Admin auth | **Fixed password** (env var) + signed token | Single operator credential for the daily-puzzle scheduling page (§3.3) |
| Language | **TypeScript** (`strict` mode) | First-class in both Vue 3 (`<script setup lang="ts">`, Vite transpiles natively) and Node/Express. Dev: run with `tsx`; production: compile with `tsc` → `dist/`. |

### Package names (for package.json)
**Backend (runtime):** `express`, `better-sqlite3`, `mathjs`, `cors`, `uuid`, `bcrypt` (hash the admin/user passwords), `jsonwebtoken` (admin + user session tokens), `zod` (validate every request body), `express-rate-limit` (throttle admin login, §3.3), `dotenv` (load env vars in dev)
**Backend (dev / types):** `typescript`, `tsx` (run TS directly in dev), `@types/node`, `@types/express`, `@types/better-sqlite3`, `@types/cors`, `@types/bcrypt`, `@types/jsonwebtoken`, `@types/uuid` — `mathjs` ships its own types.
**Frontend (runtime):** `vue`, `vite`, `@vitejs/plugin-vue`, `tailwindcss`, `pinia`, `chart.js`, `vue-chartjs`
**Frontend (dev):** `typescript`, `vue-tsc` (type-check `.vue` files at build time)
**Tooling (both):** `vitest` (unit + component tests), `@vue/test-utils` (component tests), `eslint` + `prettier` (lint/format)
**HTTP client:** native `fetch` (no axios — built into modern browsers and Node 18+).

> **Type safety leverage:** define shared types for the **API contracts** (§8 request/response shapes) and the **domain model** (the coefficient array, `gameStatus`, `command` unions) in one place so the frontend and backend stay in lockstep — this is where TypeScript pays for itself in this project. Derive these types from `zod` schemas (`z.infer<...>`) so runtime validation and compile-time types share one source of truth.

### 2.1 Testing & Validation Strategy
- **Unit tests (Vitest)** for the pure engine modules — `polynomial.ts`, `derivative.ts`, `parser.ts` — are the priority: they encode the §13 math rules and have no I/O, so they're fast and deterministic. Cover generation bounds (degree 1–3, coeffs −10..10), derivative signs incl. the `"Stationary"` case, and `target` equivalence (reordered/factored forms accept; near-misses reject).
- **Route tests (Vitest)** hit the Express endpoints against an in-memory / temp SQLite DB to verify turn accounting, the secret never leaking, and admin auth.
- **Component tests (Vitest + @vue/test-utils)** for the grid, input panel, and win/share behavior.
- **Runtime validation (zod):** every request body (`x` values, `target` expression, admin puzzle submissions) is parsed through a zod schema at the route boundary; reject with `400` on failure. This is the runtime complement to TypeScript's compile-time checks.

---

## 3. Game Modes

### 3.1 Daily Puzzle Mode
- All players worldwide receive the **same secret polynomial** on the same calendar day.
- One puzzle per day, drawn from a **curated bank** scheduled in advance by the mathematician through the admin page (see §3.3). If no puzzle has been scheduled for a given date, the backend **deterministically generates** one from the date as a fallback, so the game never breaks.
- After winning/losing, the player can share results (see Section 7).
- Stats are tracked per user (see Section 6).

### 3.2 Free Play Mode
- A **new random polynomial** is generated for each session.
- No daily limit; player can replay as many times as desired.
- Stats are tracked separately from Daily mode.

### 3.3 Daily Puzzle Authoring (Admin Page)
Daily puzzles use a **curated bank** rather than live daily authoring: the mathematician schedules puzzles ahead of time — days, weeks, or months in advance — through a simple, password-protected admin page. He does **not** need to enter a puzzle every morning; he tops up the queue whenever convenient.

> **Terminology:** In Funcle the "question" is always the same — *identify f(x)*. So what the author enters per date is really the **answer** (the secret polynomial). There is no separate per-day question text.

**Access & authentication**
- A single, fixed **admin password** gates the page. It is stored as an environment variable (`ADMIN_PASSWORD`, as a bcrypt hash), never hardcoded or committed.
- This is separate from the optional player accounts (§5) — it is one shared operator credential, not a player account.
- On correct password, the backend issues a short-lived signed token; all admin API calls (§8) require it.
- The admin page lives on a separate route (e.g. `/admin`) and is **not** linked from the game UI.
- **Brute-force protection:** rate-limit `POST /api/admin/login` (e.g. `express-rate-limit`, a few attempts per IP per window) since the whole admin surface sits behind one password.

**What the page does (intentionally simple)**
- Lists upcoming dates and the puzzle scheduled for each (or shows the slot as empty).
- A form to schedule / edit a puzzle for a chosen future date:
  - **Answer (the secret function):** entered as a math expression, e.g. `x^2 - 4`. The backend parses it with `mathjs` into the coefficient array and **validates it against the confirmed rules in §13** (degree 1–3, integer coefficients −10..10). Invalid entries are rejected with a clear message.
  - **Note (optional):** a private label for the author's own reference (e.g. "intro quadratic", a difficulty tag). Never shown to players.
- Supports scheduling many dates ahead, plus editing/deleting **future** puzzles. Today's and past puzzles are **locked (immutable)** to preserve fairness and the historical record.

**Fallback when the bank runs dry**
- `GET /api/daily` first looks for a curated puzzle for today. If none exists, it deterministically generates a polynomial seeded from the date, persists it (marked `source = 'generated'`), and serves it — guaranteeing every player still receives the same puzzle that day.

---

## 4. Core Game Mechanics

### 4.1 The Secret Function
The system generates and stores a secret polynomial:

$$f(x) = a_n x^n + a_{n-1} x^{n-1} + \dots + a_1 x + a_0$$

- All coefficients $a_i$ are **integers**.
- **Degree:** between 1 and **3** (linear, quadratic, or cubic).
- **Coefficient range:** each $a_i$ is an integer from **−10 to +10**. The leading coefficient $a_n$ may be negative (but must be non-zero so the degree is well-defined).
- The polynomial is stored **only on the backend** — it must never be sent to the browser in any API response, to prevent cheating via browser devtools.
- Stored in the database as a JSON array of coefficients, e.g. `[1, 0, -4]` represents $x^2 - 4$ (index = degree, from highest to lowest).

### 4.2 Turn Limit
- The player has a maximum of **6 turns total**, shared across all command types.
- Each submitted command (regardless of type) consumes exactly 1 turn.
- When turns reach 0 and no correct `target` has been submitted, the game state becomes `lost`.

### 4.3 Commands

#### `val x`
- **What it does:** Evaluates the secret function at the given x-value. Returns $f(x)$.
- **Backend logic:** Substitute x into the polynomial using coefficient array.
- **Response:** An exact number. Since `x` may be a decimal (see §4.3 `is_inc` / §7.5), the result may be a decimal as well.
- **UI display row color:** Green 🟩
- **Example:** `val 0` → `-4` (for $f(x) = x^2 - 4$)

#### `is_inc x`
- **What it does:** Evaluates the first derivative $f'(x)$.
  - If $f'(x) > 0$: return `"Increasing"`
  - If $f'(x) < 0$: return `"Decreasing"`
  - If $f'(x) = 0$: return `"Stationary"`
- **Backend logic:** Compute derivative coefficients from the polynomial array, then evaluate at x.
- **UI display row color:** Yellow 🟨
- **Example:** `is_inc 3` → `"Increasing"` (for $f'(x) = 2x$, $f'(3) = 6 > 0$)

#### `target [expression]`
- **What it does:** The player submits their guess for the secret polynomial as a math expression string.
- **Backend logic:** Parse the player's expression with `mathjs` (`math.parse(...).compile()`), then test equivalence against the secret by **numeric sampling** — see the equivalence rule below.
- **Win condition:** If the guess is equivalent to the secret → game state becomes `won`.
- **Lose condition:** If wrong and turns remain → consume 1 turn, continue. If wrong and 0 turns remain → game state becomes `lost`.
- **Equivalence rule (sampling-based):** Two polynomials are identical iff they agree at enough distinct points, so equivalence is decided by **evaluating both the guess and the secret at ~8 distinct sample x-values** (mix in non-integers like `0.5`, `-1.5` so a wrong guess can't coincidentally match at integers) and accepting only if **all** agree within a small epsilon (e.g. `1e-9`). This is more robust than symbolic simplification and naturally accepts reordered (`-4 + x^2`) and factored (`(x-2)(x+2)`) forms. **Security:** restrict the parsed expression to the single variable `x` and arithmetic operators — reject any other symbols or function calls, and never call `math.evaluate` on the raw string.
- **Example:** `target x^2 - 4` → Win (if secret is $x^2 - 4$)

### 4.4 Example Game Session
Secret function: $f(x) = x^2 - 4$

| Turn | Command | Backend Calculation | Result Displayed |
|---|---|---|---|
| 1 | `val 0` | $f(0) = -4$ | `-4` |
| 2 | `val 3` | $f(3) = 5$ | `5` |
| 3 | `is_inc 3` | $f'(3) = 6 > 0$ | `Increasing` |
| 4 | `is_inc -3` | $f'(-3) = -6 < 0$ | `Decreasing` |
| 5 | `target x^2 - 4` | Symbolic match | **WIN** |

---

## 5. User System

### 5.1 Registration / Login
- Login is **optional**. Players can play anonymously without an account.
- Authentication is simple — username + password only. No OAuth for v1.
- Passwords must be stored as bcrypt hashes. **Never store plaintext passwords.**
- Anonymous sessions use a browser-local UUID stored in localStorage.

### 5.2 Stats Tracking
- Stats are tracked per user (if logged in) or per browser session (if anonymous).
- Anonymous stats do NOT persist if the user clears browser storage.
- Logged-in stats persist in the database.

---

## 6. Share Feature (Wordle-Style)

After a game ends (win or lose), a "Share" button appears.

Clicking it copies an emoji grid to clipboard in this format:
```
Funcle - Daily #42 — 5/6

🟩 val
🟩 val
🟨 is_inc
🟨 is_inc
🎯 target ✅
```

Rules:
- Each row shows the command type as an emoji (🟩 for `val`, 🟨 for `is_inc`, 🎯 for `target`).
- No x-values or results are revealed in the share text (to avoid spoilers).
- A checkmark ✅ appears on the winning `target` row; ❌ on failed `target` rows.
- The puzzle number is shown for Daily mode. Free Play shows "Free Play" instead.

---

## 7. UI Specification

> **Scope of the blueprint:** `design/funcle_ui_blueprint.html` is a **CSS / styling reference for the main game screen only** (header, the 6-row clue grid, and the input controls). It intentionally does **not** cover the polynomial graph, the Stats screen, the Help screen, or the Settings panel — those are separate screens/overlays that should be built **consistently** with the blueprint's palette and tokens (§7.2), but their layout is defined here in §7, not in the blueprint.

### 7.1 Layout (single-column, mobile-first, tablet-friendly)
The main game screen matches the blueprint: a centered single column with **header (top) → 6-row clue grid (center) → input controls (bottom)**. The polynomial graph is **not** shown during play (see §7.4) — it is revealed only after the game ends.

```
+-----------------------------------------------+
|              F U N C L E                      |
|       The Function Detective Puzzle           |
|           [?] [Stats] [⚙]                    |
+-----------------------------------------------+
|                                               |
|  [--- History Grid (6 rows) ---]              |
|  R1 🟩  VAL 0          |  -4                 |
|  R2 🟨  IS_INC 1       |  Increasing         |
|  R3 ·   Awaiting clue entry…                  |
|  R4 ·   (empty, dashed)                        |
|  ...                                          |
|                                               |
+-----------------------------------------------+
|  Select Action:  [val (Evaluate Point) ▼]     |
|  Input x:        [  2  ]                      |
|  [         SUBMIT CLUE         ]              |
|  Remaining Guess Bullets: 4 / 6               |
+-----------------------------------------------+

   On game end → reveal the plotted curve y = f(x)
   (end-game overlay / panel; see §7.4)
```

### 7.2 Color Palette (Dark Theme)

The canonical values live in `design/funcle_ui_blueprint.html` — use these exact hexes. (The `Blueprint var` column gives the CSS variable names already used in that file.)

| Token | Blueprint var | Hex / value | Usage |
|---|---|---|---|
| `--color-bg` | `--bg-color` | `#121213` | Page / canvas background |
| `--color-card` | `--card-bg` | `#1a1a1b` | Grid-row & input background (**new** — was missing) |
| `--color-border` | `--border-color` | `#3a3a3c` | Default row/input borders, empty rows |
| `--color-success` | `--color-val` | `#538d4e` | `val` marker, win state, submit button |
| `--color-success-hover` | — | `#43723f` | Submit button hover |
| `--color-directional` | `--color-inc` | `#b59f3b` | `is_inc` marker |
| `--color-text` | `--text-color` | `#ffffff` | Primary text |
| `--color-text-muted` | `--text-muted` | `#818384` | Secondary text, labels, placeholders |

**Row-state fills** (translucent, layered over `--color-card`):
- `val` row → border `#538d4e`, fill `rgba(83, 141, 78, 0.15)`, filled green badge.
- `is_inc` row → border `#b59f3b`, fill `rgba(181, 159, 59, 0.15)`, filled yellow badge.
- `target` win row → green (`#538d4e`); fail row → muted gray (`#3a3a3c`).
- empty row → dashed border, `opacity: 0.3`.

### 7.3 History Grid Rows
Structure and states follow `design/funcle_ui_blueprint.html`. Per `design/convert_css.txt`, the `state-*` CSS classes should drive how `GameRow.vue` re-renders dynamically based on command type.

- **6 fixed rows**, vertical stack, ~8px gap. Each row: card background, 2px border, 6px radius, ~52px tall, padding `0 16px`, with a `0.3s` transition for the fill-in animation.
- **Row anatomy:** left = an uppercase **badge** pill showing command + x (e.g. `VAL 0`, `IS_INC 1`); right = the **result value** in monospace (`Courier New`, ~1.2rem).
- **Row states (CSS classes):**
  - `state-val` — green border + translucent green fill + green badge.
  - `state-inc` — yellow border + translucent yellow fill + yellow badge.
  - `target` rows — win = green, fail = muted gray.
  - **active / awaiting row** — default solid border, a small gray dot, and italic muted placeholder text "*Awaiting clue entry…*", empty result.
  - `state-empty` — dashed border, `opacity: 0.3`, just a small gray dot.
- When a command is submitted it fills the next empty row, top to bottom. Rows are **immutable** once filled.

### 7.4 Polynomial Graph (end-of-game reveal)
- **Hidden during play, revealed only when the game ends** (win or lose) — this both preserves the puzzle (the curve would give away the answer) and keeps the play screen uncluttered on small screens.
- On game end, render the full curve $y = f(x)$ with a Chart.js line chart, **marking the player's discovered `val` points** on it. X-axis range centered around the submitted x-values. Shown on the end-game overlay / a panel that expands beneath the grid.
- **Client-side & lightweight:** Chart.js renders in the browser from the coefficients the backend returns at game end (the `secret`), so there is **no meaningful server cost** — the toggle below exists for user preference and small-screen comfort, not server load.
- **Show-graph toggle (parameter):** a setting (default **ON**) lets the player turn the end-game graph off. Exposed in the Settings (⚙) panel and persisted in `localStorage`; it can also be disabled globally via a build/runtime config flag if ever needed. When off, the end screen simply omits the chart.
- **Responsive:** the chart must size fluidly to the container so it reads well on both phone and tablet (iPad) widths (see §7.6).

### 7.5 Input Panel
A bottom control block (separated by a top border), laid out per the blueprint: a row with the action dropdown (flex-grow) beside a narrow x input (~100px), then a full-width submit button, then a status line.

- **Command dropdown:** `val` / `is_inc` / `target` — never allow free-text command entry. Use descriptive option labels from the blueprint: `val (Evaluate Point)`, `is_inc (Check Direction)`, `target (Submit Final Guess)`.
- **x-value input:** A narrow number field for `val` and `is_inc`. Accepts both decimals and integers (`type="number" step="any"`, placeholder e.g. `e.g. 5`). Invalid input returns `"error"` and prompts the player to retry (the turn is not consumed on an invalid input — see §8 note).
- **Expression input:** A text field that replaces the x-value field when `target` is selected.
- **Submit button:** Full-width, green (`--color-success`, hover `--color-success-hover`), uppercase label "SUBMIT CLUE", ~42px tall. Disabled when turns = 0 or game is won/lost.
- **Status bar:** Centered, muted, always visible — blueprint copy "Remaining Guess Bullets: N / 6" (a.k.a. turns remaining).

### 7.6 Layout, Container & Typography
Per `design/funcle_ui_blueprint.html`:
- **Container:** mobile-first, centered; `max-width 450px`, `max-height 750px`, full-height, 1px border, `15px` padding. Vertical flex with `space-between`: **header (top) → grid (center, `flex-grow`, vertically centered) → controls (bottom)**.
- **Header:** centered, bottom border. Title `FUNCLE` (h1, ~2.2rem, `letter-spacing: 3px`, bold) and a muted **subtitle** "*The Function Detective Puzzle*" (~0.8rem). Three action icons sit in the header: **`[?]` Help** (how-to-play), **`[Stats]`** (streaks + win distribution, §7.7), and **`[⚙]` Settings** (incl. the show-graph toggle, §7.4).
- **Fonts:** UI in `Segoe UI, Tahoma, Geneva, Verdana, sans-serif`; result values and other numeric output in `Courier New` monospace.

### 7.7 Responsiveness & Secondary Screens
- **Target devices:** the game must look and play well on **mobile phones and tablets (iPad)**. Mobile-first; the centered single-column card scales up gracefully on larger/tablet widths (the `max-width` keeps line lengths comfortable, the card stays centered on the dark canvas). Use `min-height: 100vh`/dynamic viewport units so it fills the screen, and fluid sizing so it adapts to portrait and landscape.
- **Touch-friendly:** interactive targets (dropdown, input, submit, header icons) should be at least ~44px tall for comfortable tapping.
- **Secondary screens (Help / Stats / Settings):** presented as **overlays/modals** above the game, styled with the same palette and tokens (§7.2). The blueprint does not cover these — design them consistently here:
  - **Help** — short how-to-play: the three commands, the 6-turn limit, and the win condition.
  - **Stats** — games played, win %, current/max streak, and the win-distribution bar chart (data from `GET /api/stats/:userId`, §8).
  - **Settings** — the show-graph toggle (§7.4) and any future preferences.

---

## 8. API Endpoints (Backend Routes)

All routes are prefixed with `/api`. All request and response bodies are JSON.

### POST `/api/session/new`
Start a new Free Play game session.
- **Request:** `{ "userId": "string|null" }`
- **Response:** `{ "sessionId": "uuid", "turnsRemaining": 6 }`
- **Note:** The secret polynomial is generated server-side and stored in DB. It is **never** included in the response.

### GET `/api/daily`
Start or resume today's Daily Puzzle session.
- **Request:** query param `userId` (optional)
- **Response:** `{ "sessionId": "uuid", "turnsRemaining": 6, "puzzleNumber": 42, "history": [...] }`
- **Note:** If the user already played today, `history` contains their previous moves and `turnsRemaining` reflects current state.
- **Puzzle source:** Serves the curated puzzle scheduled for today (§3.3). If none is scheduled, the backend deterministically generates one from the date, persists it (`source = 'generated'`), and serves that. The polynomial itself is never returned.

### POST `/api/game/val`
Evaluate `val x`.
- **Request:** `{ "sessionId": "uuid", "x": number }`
- **Response:** `{ "result": number, "turnsRemaining": 5, "gameStatus": "active" }`
- **Note:** `x` may be any integer or decimal. Invalid input returns `{ "result": "error", ... }` with `turnsRemaining` unchanged, so the player can retry without losing a turn.

### POST `/api/game/is_inc`
Evaluate `is_inc x`.
- **Request:** `{ "sessionId": "uuid", "x": number }`
- **Response:** `{ "result": "Increasing"|"Decreasing"|"Stationary", "turnsRemaining": 5, "gameStatus": "active" }`
- **Note:** `"Stationary"` is returned when `f'(x) = 0`. As with `val`, invalid `x` returns `{ "result": "error", ... }` and does not consume a turn.

### POST `/api/game/target`
Submit a guess expression.
- **Request:** `{ "sessionId": "uuid", "expression": "x^2 - 4" }`
- **Response (win):** `{ "correct": true, "gameStatus": "won", "turnsUsed": 5, "secret": "x^2 - 4" }`
- **Response (wrong):** `{ "correct": false, "gameStatus": "active"|"lost", "turnsRemaining": 4 }`
- **Note:** On win or loss, `secret` is revealed in the response so the frontend can display it.

### GET `/api/stats/:userId`
Retrieve a user's personal statistics.
- **Response:**
```json
{
  "gamesPlayed": 42,
  "gamesWon": 35,
  "currentStreak": 5,
  "maxStreak": 12,
  "winDistribution": { "1": 2, "2": 5, "3": 10, "4": 9, "5": 6, "6": 3 }
}
```

### Admin / Puzzle Management (password-protected)
All admin routes require the admin token from `POST /api/admin/login` (see §3.3). The secret coefficients are exposed **only** through these authenticated routes — never through any player-facing route.

#### POST `/api/admin/login`
- **Request:** `{ "password": "string" }`
- **Response (ok):** `{ "token": "string" }`
- **Response (bad):** `401 { "error": "Invalid password" }`
- **Rate-limited:** repeated attempts from an IP return `429 { "error": "Too many attempts, try again later" }` (§3.3).

#### GET `/api/admin/puzzles`
List scheduled puzzles. Requires admin token.
- **Query:** optional `from` / `to` ISO dates to bound the range.
- **Response:** `[{ "puzzleDate": "2026-06-10", "puzzleNumber": 43, "expression": "x^2 - 4", "note": "intro quadratic", "source": "curated" }, ...]`

#### POST `/api/admin/puzzles`
Schedule a puzzle for a future date.
- **Request:** `{ "puzzleDate": "2026-06-10", "expression": "x^2 - 4", "note": "optional" }`
- **Behavior:** Parse + validate `expression` against the §13 rules, then store the coefficient array in `daily_puzzles` with `source = 'curated'`.
- **Response (ok):** `{ "puzzleDate": "2026-06-10", "puzzleNumber": 43 }`
- **Response (invalid):** `400 { "error": "Polynomial violates rules: <reason>" }`
- **Response (taken):** `409 { "error": "A puzzle already exists for that date" }` — use PUT to change it.

#### PUT `/api/admin/puzzles/:date`
Edit a **future** scheduled puzzle. Same body and validation as POST. Returns `403` for today's or past dates (locked).

#### DELETE `/api/admin/puzzles/:date`
Remove a **future** scheduled puzzle. Returns `403` for today's or past dates.

---

## 9. Database Schema (SQLite)

### Table: `daily_puzzles`
Stores one polynomial per calendar day. Rows are written either by the admin page (`source='curated'`, §3.3) or by the deterministic fallback generator (`source='generated'`).
```sql
CREATE TABLE daily_puzzles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  puzzle_date   TEXT NOT NULL UNIQUE,   -- ISO date, e.g. '2026-06-09'
  puzzle_number INTEGER NOT NULL,
  coefficients  TEXT NOT NULL,          -- JSON array, e.g. '[1,0,-4]' = x^2 - 4
  source        TEXT NOT NULL DEFAULT 'curated',  -- 'curated' (admin-authored) | 'generated' (fallback)
  note          TEXT,                   -- optional private author label, never shown to players
  created_at    TEXT NOT NULL           -- ISO datetime
);
```

> **Admin auth needs no table.** The single operator credential lives in the `ADMIN_PASSWORD` environment variable (bcrypt hash) — see §3.3. Issued admin tokens are signed (`jsonwebtoken`) and stateless, so they need no DB storage either.

### Table: `sessions`
One row per game session (both daily and free play).
```sql
CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,         -- UUID
  mode         TEXT NOT NULL,            -- 'daily' | 'freeplay'
  user_id      TEXT,                     -- NULL for anonymous
  puzzle_date  TEXT,                     -- NULL for freeplay
  coefficients TEXT NOT NULL,            -- JSON array, secret polynomial
  status       TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'won' | 'lost'
  turns_used   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL             -- ISO datetime
);
```

### Table: `moves`
Full move history per session.
```sql
CREATE TABLE moves (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   TEXT NOT NULL REFERENCES sessions(id),
  turn_number  INTEGER NOT NULL,         -- 1–6
  command      TEXT NOT NULL,            -- 'val' | 'is_inc' | 'target'
  input_x      REAL,                     -- NULL for 'target' command
  expression   TEXT,                     -- NULL for 'val' and 'is_inc'
  result       TEXT NOT NULL,            -- Stored as string for all types
  created_at   TEXT NOT NULL
);
```

### Table: `users`
Optional user accounts.
```sql
CREATE TABLE users (
  id           TEXT PRIMARY KEY,         -- UUID
  username     TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- bcrypt hash, never plaintext
  created_at   TEXT NOT NULL
);
```

### Table: `user_stats`
Aggregated stats per user.
```sql
CREATE TABLE user_stats (
  user_id          TEXT PRIMARY KEY REFERENCES users(id),
  games_played     INTEGER NOT NULL DEFAULT 0,
  games_won        INTEGER NOT NULL DEFAULT 0,
  current_streak   INTEGER NOT NULL DEFAULT 0,
  max_streak       INTEGER NOT NULL DEFAULT 0,
  win_distribution TEXT NOT NULL DEFAULT '{}'  -- JSON: {"1":0,"2":0,...,"6":0}
);
```

---

## 10. Frontend Component Map

| File | Location | Responsibility |
|---|---|---|
| `App.vue` | `frontend/src/` | Root component, router outlet |
| `GameView.vue` | `frontend/src/views/` | Assembles all panels for the main game page |
| `AppHeader.vue` | `components/layout/` | Title bar, Help / Stats / Settings buttons |
| `GameGrid.vue` | `components/game/` | Container for the 6 history rows |
| `GameRow.vue` | `components/game/` | Single row: marker + command label + result |
| `WinScreen.vue` | `components/game/` | Win/lose overlay modal: result, share button, and the end-game graph (§7.4) |
| `PolynomialChart.vue` | `components/graph/` | Chart.js curve + discovered `val` points; rendered only on game end, hidden when the show-graph setting is off (§7.4) |
| `CommandSelector.vue` | `components/input/` | Dropdown: val / is_inc / target |
| `ValueInput.vue` | `components/input/` | Number input (val/is_inc) or text input (target) — switches based on selected command |
| `SubmitButton.vue` | `components/input/` | SUBMIT CLUE button, disabled on game end |
| `StatsModal.vue` | `components/overlay/` | Stats screen (§7.7): games played, win %, streaks, win-distribution chart (from `GET /api/stats/:userId`) |
| `HelpModal.vue` | `components/overlay/` | How-to-play screen (§7.7) |
| `SettingsModal.vue` | `components/overlay/` | Settings screen (§7.7): show-graph toggle + future prefs |
| `AdminView.vue` | `frontend/src/views/` | Password-gated daily-puzzle scheduling page (§3.3): login, upcoming-dates table, add/edit form. Routed at `/admin`, not linked from the game UI. |
| `gameStore.js` | `frontend/src/stores/` | Pinia store: sessionId, history[], turnsRemaining, gameStatus, mode |
| `settingsStore.js` | `frontend/src/stores/` | Pinia store for client prefs (e.g. `showGraph`), persisted to `localStorage` |
| `adminStore.js` | `frontend/src/stores/` | Pinia store for admin session: token, scheduled-puzzle list, form state |

### Pinia Store Shape (`gameStore.js`)
```js
state: {
  sessionId: null,          // string UUID from backend
  mode: 'daily',            // 'daily' | 'freeplay'
  history: [],              // Array of { command, x, expression, result, turnNumber }
  turnsRemaining: 6,
  gameStatus: 'idle',       // 'idle' | 'active' | 'won' | 'lost'
  secret: null,             // revealed only after game ends
  discoveredPoints: [],     // [{x, y}] for Chart.js scatter
}
```

---

## 11. Backend Engine Map

| File | Location | Responsibility |
|---|---|---|
| `server.js` | `backend/` | Express entry point, mounts all routes |
| `polynomial.js` | `backend/engine/` | Random **and deterministic (date-seeded)** polynomial generation per §13 rules, `evaluate(coeffs, x)` |
| `derivative.js` | `backend/engine/` | Compute derivative coefficients, `evaluateDerivative(coeffs, x)` → result string |
| `parser.ts` | `backend/engine/` | Safely parse user expression (restricted to `x` + operators), test equivalence vs the secret by **numeric sampling** at several distinct points (§4.3) |
| `sessionRoute.js` | `backend/routes/` | POST /api/session/new, GET /api/daily |
| `gameRoute.js` | `backend/routes/` | POST /api/game/val, /is_inc, /target |
| `statsRoute.js` | `backend/routes/` | GET /api/stats/:userId |
| `adminRoute.js` | `backend/routes/` | POST /api/admin/login, GET/POST/PUT/DELETE /api/admin/puzzles |
| `adminAuth.js` | `backend/middleware/` | Verifies the admin token on protected `/api/admin/*` routes |
| `db.js` | `backend/db/` | SQLite connection, schema init, query helper functions |
| `schema.sql` | `backend/db/` | All CREATE TABLE statements (source of truth for DB structure) |

---

## 12. Folder Structure Reference

```
Funcle/
├── docs/
│   ├── proposal/          ← project_proposal.md (original project brief)
│   ├── decisions/         ← Architecture decision records (ADRs)
│   └── references/        ← External research, Wordle analysis, links
├── design/
│   ├── wireframes/        ← Low-fidelity layout sketches
│   ├── mockups/           ← High-fidelity UI exports (Figma, etc.)
│   └── assets/            ← Color palette definitions, icon references
├── math/
│   ├── rules/             ← Validated answers to Section 13 (math rules)
│   ├── function_sets/     ← Mathematician's draft/source puzzle lists (the live daily schedule lives in the DB, written via the admin page — §3.3)
│   └── proofs/            ← Mathematician's working notes and derivations
├── backend/
│   ├── routes/            ← Express route handler files
│   ├── middleware/        ← Express middleware (e.g. admin token auth)
│   ├── engine/            ← Pure math logic (polynomial, derivative, parser)
│   └── db/                ← SQLite schema and query helpers
├── frontend/
│   └── src/
│       ├── components/    ← Vue components (game/, graph/, input/, layout/)
│       ├── views/         ← Page-level Vue views
│       ├── stores/        ← Pinia state stores
│       └── assets/styles/ ← CSS variables and global styles
└── tests/
    ├── backend/           ← Unit tests for engine (polynomial, derivative, parser)
    └── frontend/          ← Component tests
```

---

## 13. ✅ Confirmed Math Rules

> **All five math-validation questions have been answered and confirmed by the mathematician** (source: `docs/proposal/project_proposal.md` §5). They are no longer blocking. The confirmed rules below are authoritative and are baked into the relevant sections above. When the `math/` directory is created, mirror this table into `math/rules/math_rules.md`.

| # | Rule | Confirmed answer | Governs |
|---|---|---|---|
| **Q1** | **Max polynomial degree ($n$)** | **3.** Secret functions are degree 1–3 (linear, quadratic, or cubic). | `backend/engine/polynomial.js` — degree range for generator |
| **Q2** | **Coefficient range** | Integers from **−10 to +10**. The leading coefficient $a_n$ may be negative, but must be non-zero so the degree is well-defined. | `backend/engine/polynomial.js` — random generation bounds |
| **Q3** | **`is_inc` at stationary point ($f'(x) = 0$)** | Return **`"Stationary"`**. | `backend/engine/derivative.js`, `frontend/src/components/game/GameRow.vue` result display |
| **Q4** | **Domain for $x$ inputs** | **Any integer or decimal** is allowed (e.g. `val 1.5`). Invalid input returns `"error"` and prompts the player to try again **without consuming a turn**. | `frontend/src/components/input/ValueInput.vue` (`step="any"`), backend input validation |
| **Q5** | **`target` equivalence rule** | Equivalence accepted for reordered (`-4 + x^2`) and factored (`(x-2)(x+2)`) forms. Implemented via **numeric sampling** at several distinct points rather than symbolic simplification (more robust) — see §4.3. | `backend/engine/parser.ts` — core matching algorithm |

### Implementation order for the math engine (now unblocked):
1. Mirror this table into `math/rules/math_rules.md` when the `math/` directory is created.
2. Implement `backend/engine/polynomial.js` (Q1 + Q2).
3. Implement `backend/engine/derivative.js` (Q3).
4. Implement `backend/engine/parser.js` (Q5).
5. Implement `frontend/src/components/input/ValueInput.vue` input validation (Q4).
6. All other components (routes, DB, Vue UI) have no math dependency and can be built in parallel.

---

## 14. Development Order Recommendation

Build in this sequence to unblock work as early as possible:

1. **DB schema + `backend/db/db.js`** — No math dependency, enables all other backend work.
2. **`backend/server.js` + route stubs** — Skeleton API with placeholder responses.
3. **Frontend scaffold** — Vite + Vue 3 + Tailwind setup, static main-game-screen layout per the blueprint (header, GameGrid with hardcoded rows, input controls). No graph here.
4. **Pinia store + API wiring** — Connect frontend to backend stubs.
5. **`polynomial.js` + `derivative.js` + `parser.js`** — implement per the confirmed math rules in §13 (Q1–Q5).
6. **Full game loop integration** — Wire math engine to routes, replace stubs; game reaches `won`/`lost` and the backend reveals `secret`.
7. **Daily puzzle pipeline** — Deterministic date-seeded fallback generator in `polynomial.js`, then the admin scheduling page (`adminRoute.js` + `adminAuth.js` + `AdminView.vue`) so the mathematician can queue puzzles (§3.3).
8. **End-of-game graph reveal** — `PolynomialChart.vue` on the win/lose screen, plotting the revealed `secret` + discovered `val` points, gated by the `showGraph` setting (§7.4). Built *after* the game loop because it depends on the end state and the revealed secret — not earlier with mock data.
9. **Auth system** — Optional login, user stats.
10. **Secondary screens** — Stats, Help, Settings overlays (§7.7), incl. the show-graph toggle in Settings.
11. **Share feature** — Clipboard emoji grid.
12. **Tests** — Write Vitest unit tests for the engine against the confirmed rules in §13, plus route and component tests (see §2.1). (Write engine tests alongside step 5, not only at the end.)

> **Filename note:** the `.js` names in §10–§14 are illustrative — under the TypeScript decision (§2) source files are `.ts` (and `.vue` with `lang="ts"`).

---

## 15. Deployment Notes

- **Host on a container / VPS, not edge-serverless.** `better-sqlite3` is a **native module** (compiles on install) and SQLite needs a **persistent disk**. Platforms like **Fly.io, Railway, Render, or a small VPS/Droplet** are a good fit. Avoid Vercel/Netlify functions and Cloudflare Workers — their ephemeral filesystem would wipe puzzles + stats, and the native module won't run on Workers.
- **Persistent volume:** mount the SQLite file on a persistent volume so daily puzzles, sessions, and stats survive redeploys.
- **Environment variables:** `ADMIN_PASSWORD` (bcrypt hash), the JWT signing secret, and DB file path. Commit a `.env.example` (names only, no values); load via `dotenv` in dev and the host's secret manager in prod.
- **Build:** frontend `vite build` → static assets; backend `tsc` → `dist/`, run the compiled JS with `node dist/server.js`.
- **Single-origin option:** serve the built frontend as static files from Express so frontend and API share one origin — this removes the need for `cors` and simplifies deployment to a single service. Keep `cors` only if you deploy them separately.
- **Backups:** a periodic copy of the SQLite file (e.g. nightly) is enough insurance for this scale.
