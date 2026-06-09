# Funcle — Project Specification
## AI Development Reference Document
> **For AI developers**: This document is the single source of truth for building Funcle. Read it fully before writing any code. Sections marked `⚠ PENDING` contain unresolved decisions that **block** specific components — do not implement those components with assumptions; wait for the answers or flag them to the project owner.

---

## 1. Project Overview

**Funcle** ("Function Wordle") is a web-based, turn-based mathematical deduction puzzle. The player acts as a "Function Detective" trying to identify a secret polynomial function $f(x)$ within 6 moves by querying the function's values and derivative behavior.

**Collaborative structure:**
- **Mathematician (son):** Defines and validates all math rules. Responsible for answering PENDING questions in Section 9.
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

### Package names (for package.json)
**Backend:** `express`, `better-sqlite3`, `mathjs`, `cors`, `uuid`
**Frontend:** `vue`, `vite`, `@vitejs/plugin-vue`, `tailwindcss`, `pinia`, `chart.js`, `vue-chartjs`, `axios`

---

## 3. Game Modes

### 3.1 Daily Puzzle Mode
- All players worldwide receive the **same secret polynomial** on the same calendar day.
- One puzzle per day. The polynomial is pre-seeded or generated deterministically from the date.
- After winning/losing, the player can share results (see Section 7).
- Stats are tracked per user (see Section 6).

### 3.2 Free Play Mode
- A **new random polynomial** is generated for each session.
- No daily limit; player can replay as many times as desired.
- Stats are tracked separately from Daily mode.

---

## 4. Core Game Mechanics

### 4.1 The Secret Function
The system generates and stores a secret polynomial:

$$f(x) = a_n x^n + a_{n-1} x^{n-1} + \dots + a_1 x + a_0$$

- All coefficients $a_i$ are **integers**.
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
- **Response:** An exact number (integer or decimal depending on PENDING Q4).
- **UI display row color:** Green 🟩
- **Example:** `val 0` → `-4` (for $f(x) = x^2 - 4$)

#### `is_inc x`
- **What it does:** Evaluates the first derivative $f'(x)$.
  - If $f'(x) > 0$: return `"Increasing"`
  - If $f'(x) < 0$: return `"Decreasing"`
  - If $f'(x) = 0$: **⚠ PENDING — see Section 9, Q3**
- **Backend logic:** Compute derivative coefficients from the polynomial array, then evaluate at x.
- **UI display row color:** Yellow 🟨
- **Example:** `is_inc 3` → `"Increasing"` (for $f'(x) = 2x$, $f'(3) = 6 > 0$)

#### `target [expression]`
- **What it does:** The player submits their guess for the secret polynomial as a math expression string.
- **Backend logic:** Parse the player's expression using `mathjs`. Simplify both the player expression and the secret polynomial, then compare symbolically.
- **Win condition:** If expressions are symbolically equivalent → game state becomes `won`.
- **Lose condition:** If wrong and turns remain → consume 1 turn, continue. If wrong and 0 turns remain → game state becomes `lost`.
- **Equivalence rule:** **⚠ PENDING — see Section 9, Q5**
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

### 7.1 Layout (two-panel, mobile-first)

```
+-----------------------------------------------+
|              F U N C L E                      |
|           [?] [Stats] [⚙]                    |
+-----------------------------------------------+
|                                               |
|  [--- History Grid (6 rows) ---]              |
|  R1 🟩  val 0          |  -4                 |
|  R2 🟨  is_inc 1       |  Increasing         |
|  R3 ⬜  ...                                  |
|  ...                                          |
|                                               |
|  [--- Polynomial Graph (Chart.js) ---]        |
|  Live curve updates as val points accumulate  |
|                                               |
+-----------------------------------------------+
|  Select Action:  [val ▼]                      |
|  Input x:        [  2  ]                      |
|  [         SUBMIT CLUE         ]              |
|  Turns remaining: 4 / 6                       |
+-----------------------------------------------+
```

### 7.2 Color Palette (Dark Theme)

| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#121213` | Canvas / page background |
| `--color-success` | `#538d4e` | `val` row marker, win state |
| `--color-directional` | `#b59f3b` | `is_inc` row marker |
| `--color-target-win` | `#538d4e` | Correct `target` row |
| `--color-target-fail` | `#3a3a3c` | Incorrect `target` row |
| `--color-empty` | `#3a3a3c` | Empty/unused row |
| `--color-text` | `#ffffff` | Primary text |
| `--color-text-muted` | `#818384` | Secondary text |

### 7.3 History Grid Rows
- 6 fixed rows. Empty rows show a blank placeholder.
- When a command is submitted, it fills the next empty row (top to bottom).
- Each row displays: colored marker | command label + x value | result value.
- Rows are **immutable** once filled — they never change.

### 7.4 Polynomial Graph Panel
- Uses Chart.js line chart.
- Renders the curve $y = f(x)$ **only after the game ends** (win or lose) — to prevent the graph from giving away the answer mid-game.
- During the game: shows only the **discovered points** as scatter dots on a blank coordinate plane.
- X-axis range: dynamic, centered around submitted x-values.
- On game end: the full polynomial curve is revealed, connecting all scatter points.

### 7.5 Input Panel
- **Command dropdown:** `val` / `is_inc` / `target` — never allow free-text command entry.
- **x-value input:** A number field for `val` and `is_inc`. **⚠ PENDING Q4** (integer-only or float).
- **Expression input:** A text field that replaces the x-value field when `target` is selected.
- **Submit button:** Disabled when turns = 0 or game is won/lost.
- **Turns counter:** Always visible.

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

### POST `/api/game/val`
Evaluate `val x`.
- **Request:** `{ "sessionId": "uuid", "x": number }`
- **Response:** `{ "result": number, "turnsRemaining": 5, "gameStatus": "active" }`

### POST `/api/game/is_inc`
Evaluate `is_inc x`.
- **Request:** `{ "sessionId": "uuid", "x": number }`
- **Response:** `{ "result": "Increasing"|"Decreasing"|"Stationary", "turnsRemaining": 5, "gameStatus": "active" }`
- **Note:** The third result value for `f'(x) = 0` is **⚠ PENDING Q3**.

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

---

## 9. Database Schema (SQLite)

### Table: `daily_puzzles`
Stores one polynomial per calendar day.
```sql
CREATE TABLE daily_puzzles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  puzzle_date   TEXT NOT NULL UNIQUE,   -- ISO date, e.g. '2026-06-09'
  puzzle_number INTEGER NOT NULL,
  coefficients  TEXT NOT NULL           -- JSON array, e.g. '[1,0,-4]' = x^2 - 4
);
```

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
| `WinScreen.vue` | `components/game/` | Win/lose overlay modal with share button |
| `PolynomialChart.vue` | `components/graph/` | Chart.js scatter+line chart component |
| `CommandSelector.vue` | `components/input/` | Dropdown: val / is_inc / target |
| `ValueInput.vue` | `components/input/` | Number input (val/is_inc) or text input (target) — switches based on selected command |
| `SubmitButton.vue` | `components/input/` | SUBMIT CLUE button, disabled on game end |
| `gameStore.js` | `frontend/src/stores/` | Pinia store: sessionId, history[], turnsRemaining, gameStatus, mode |

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
| `polynomial.js` | `backend/engine/` | Random polynomial generation, `evaluate(coeffs, x)` |
| `derivative.js` | `backend/engine/` | Compute derivative coefficients, `evaluateDerivative(coeffs, x)` → result string |
| `parser.js` | `backend/engine/` | Parse user expression string, symbolic equality check vs coefficient array |
| `sessionRoute.js` | `backend/routes/` | POST /api/session/new, GET /api/daily |
| `gameRoute.js` | `backend/routes/` | POST /api/game/val, /is_inc, /target |
| `statsRoute.js` | `backend/routes/` | GET /api/stats/:userId |
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
│   ├── function_sets/     ← Curated or approved puzzle polynomials
│   └── proofs/            ← Mathematician's working notes and derivations
├── backend/
│   ├── routes/            ← Express route handler files
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

## 13. ⚠ PENDING: Math Validation Questions

> **These questions are BLOCKING. Do not implement the components listed in "Blocks" column until the mathematician provides answers. Add the answers to `math/rules/` when confirmed.**

| # | Question | Options / Notes | Blocks |
|---|---|---|---|
| **Q1** | **Max polynomial degree ($n$):** What is the highest allowed degree for the secret function? (e.g., quadratic $n=2$, cubic $n=3$, or higher?) | Affects game solvability within 6 turns | `backend/engine/polynomial.js` — degree range for generator |
| **Q2** | **Coefficient range:** What are the allowed integer values for coefficients $a_i$? (e.g., $-10$ to $+10$). Can the leading coefficient $a_n$ be negative? | Small range = more playable; large range = harder | `backend/engine/polynomial.js` — random generation bounds |
| **Q3** | **`is_inc` at stationary point ($f'(x) = 0$):** What should the engine return when the derivative is exactly zero? Options: `"Stationary"`, `"Zero"`, an error/hint message, or something else? | Already using `"Stationary"` as placeholder in API spec above — confirm or correct | `backend/engine/derivative.js`, `frontend/src/components/game/GameRow.vue` result display |
| **Q4** | **Domain for $x$ inputs:** Can the player input decimal/fractional x-values (e.g., `val 1.5`), or only integers? | If integers-only: `ValueInput.vue` uses `type="number" step="1"`; if floats: `step="any"` | `frontend/src/components/input/ValueInput.vue`, backend input validation |
| **Q5** | **`target` equivalence rule:** If the secret is $x^2 - 4$, is `target (x-2)(x+2)` or `target -4 + x^2` accepted as correct? Or must the player enter the canonical expanded form? | If symbolic equivalence required: `mathjs` simplification before comparison; if strict string: simpler but less forgiving | `backend/engine/parser.js` — core matching algorithm |

### How to unblock after answers are received:
1. Record the answers in `math/rules/math_rules.md`.
2. Implement `backend/engine/polynomial.js` first (Q1 + Q2).
3. Implement `backend/engine/derivative.js` (Q3).
4. Implement `backend/engine/parser.js` (Q5).
5. Update `frontend/src/components/input/ValueInput.vue` input validation (Q4).
6. All other components (routes, DB, Vue UI) can be built in parallel — they do not depend on the PENDING answers.

---

## 14. Development Order Recommendation

Build in this sequence to unblock work as early as possible:

1. **DB schema + `backend/db/db.js`** — No math dependency, enables all other backend work.
2. **`backend/server.js` + route stubs** — Skeleton API with placeholder responses.
3. **Frontend scaffold** — Vite + Vue 3 + Tailwind setup, static UI layout, GameGrid with hardcoded rows.
4. **Pinia store + API wiring** — Connect frontend to backend stubs.
5. **Chart.js graph panel** — `PolynomialChart.vue` with mock data.
6. **`polynomial.js` + `derivative.js` + `parser.js`** — ⚠ Requires answers to Q1–Q5 first.
7. **Full game loop integration** — Wire math engine to routes, replace stubs.
8. **Auth system** — Optional login, user stats.
9. **Share feature** — Clipboard emoji grid.
10. **Tests** — Write tests for engine functions after Q1–Q5 are answered.
