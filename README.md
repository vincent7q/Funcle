# Funcle — The Function Detective Puzzle

A web-based, turn-based **mathematical deduction puzzle** ("Function Wordle"). You play a
*Function Detective* trying to identify a secret integer-coefficient polynomial **f(x)** in
**6 moves**, using point evaluations (`val x`), slope queries (`is_inc x`), and final guesses
(`target …`). It borrows Wordle's structure — 6 attempts, precise feedback, minimalist dark UI —
and moves the problem from words to algebra.

- **Frontend:** Vue 3 + Vite + Pinia + Tailwind + Chart.js
- **Backend:** Node + Express + SQLite (`better-sqlite3`) + a pure math engine
- **Language:** TypeScript (strict) end-to-end, with shared types/validation in `shared/`

> Full design is in [`docs/specifications.md`](docs/specifications.md); the build roadmap and
> progress are in [`docs/workflow.md`](docs/workflow.md).

---

## 1. Prerequisites

- **Node.js ≥ 20.17** (Node 22 LTS works too) and npm.
- A C/C++ toolchain is **not** usually needed — `better-sqlite3` and `bcrypt` ship prebuilt
  binaries for common platforms.

The app is two separate npm packages — **`backend/`** and **`frontend/`** — each installed and
run on its own.

---

## 2. Quick start (local development)

From the repository root:

```bash
# 1) Install dependencies (two packages)
cd backend  && npm install
cd ../frontend && npm install
```

### Configure the backend

The backend reads its config from `backend/.env`. A ready-to-use **dev** file is already
provided (it is gitignored). It sets:

| Variable | Purpose | Dev value |
|---|---|---|
| `PORT` | Backend HTTP port | `3000` |
| `DB_PATH` | SQLite file path (created on first run) | `./data/funcle.db` |
| `JWT_SECRET` | Signs admin tokens | a dev placeholder |
| `ADMIN_PASSWORD` | **bcrypt hash** of the admin password | hash of `funcle-admin` |

> **Dev admin password:** `funcle-admin` (see the Admin section below).
> To start fresh, copy `backend/.env.example` → `backend/.env` and set your own values.
> Generate a new admin hash with:
> ```bash
> cd backend
> node -e "console.log(require('bcrypt').hashSync('your-password', 10))"
> ```

### Run both servers

Open two terminals:

```bash
# Terminal 1 — backend API on http://localhost:3000
cd backend && npm run dev

# Terminal 2 — frontend on http://localhost:5173
cd frontend && npm run dev
```

Then open:

- **Play the game:** http://localhost:5173/
- **Admin (schedule puzzles):** http://localhost:5173/admin

The Vite dev server proxies `/api/*` to the backend on port 3000, so you only need to open the
frontend URL.

---

## 3. How to play

You have **6 turns** to identify the secret polynomial `f(x)` (degree 1–3, integer coefficients
from −10 to 10). Each turn you pick a command and submit it:

| Command | What it does | Feedback |
|---|---|---|
| `val x` | Evaluate `f(x)` at a number `x` (integers or decimals) | 🟩 returns the exact value |
| `is_inc x` | Check the slope `f'(x)` at `x` | 🟨 `Increasing` / `Decreasing` / `Stationary` |
| `target …` | Submit your guess for `f(x)` as an expression | 🎯 win if equivalent |

Notes:
- **Every command uses one turn** — including `val`/`is_inc`. Use them to gather clues, then
  commit a `target`.
- **Invalid `x`** (non-numeric) returns an error and **does not** cost a turn.
- **`target` accepts any equivalent form** — `x^2 - 4`, `-4 + x^2`, and `(x-2)(x+2)` all match.
  (You may use `+ - * / ^`, parentheses, and the variable `x` only.)
- You **win** when your `target` matches; you **lose** if 6 turns pass without a correct guess.
- When the game ends, the secret is revealed along with a **graph** of `f(x)` (toggleable) and a
  **Share** button that copies a spoiler-free emoji grid.

### Game modes

- **Daily** — everyone gets the same puzzle each calendar day; your progress resumes if you
  reload. (Falls back to an auto-generated puzzle if none was scheduled.)
- **Free Play** — a fresh random puzzle every game; replay as much as you like.

Switch modes with the **Daily / Free Play** tabs near the top of the screen.

---

## 4. Admin — scheduling daily puzzles

The mathematician schedules upcoming daily puzzles through a simple, password-protected page.
It is **not** linked from the game UI.

1. Go to **http://localhost:5173/admin**
2. Log in with the admin password (dev default: **`funcle-admin`**).
3. **Schedule a puzzle:**
   - **Date** — must be today or in the future.
   - **Answer** — the secret as an expression, e.g. `x^2 - 4`. It is validated against the rules:
     **degree 1–3** and **integer coefficients between −10 and 10**. Invalid answers are rejected
     with a reason.
   - **Note** *(optional)* — a private label for your own reference (never shown to players).
4. The table lists scheduled puzzles. **Future** puzzles can be **edited or deleted**; today's and
   past puzzles are **locked** to keep the game fair.

If no puzzle is scheduled for a given day, the backend deterministically generates one from the
date, so the Daily game always works.

> **Security:** the admin password is stored only as a bcrypt hash in `ADMIN_PASSWORD`; login is
> rate-limited; all admin API calls require a signed token. The secret polynomial is never sent to
> the browser during play.

---

## 5. Testing & quality

```bash
# Backend (Vitest): math engine, routes, DB
cd backend && npm test

# Frontend (Vitest + @vue/test-utils): stores, components
cd frontend && npm test
```

Other useful scripts (in each package):

```bash
npm run build     # backend: tsc -> dist/ ;  frontend: type-check + vite build
npm run lint      # ESLint
npm run format    # Prettier
```

---

## 6. Production build

```bash
# Backend
cd backend && npm run build && npm start     # runs node dist/backend/server.js

# Frontend
cd frontend && npm run build                 # static assets in frontend/dist/
```

Deploy on a **container / VPS with a persistent disk** (Fly.io, Railway, Render, a small VPS) —
**not** edge/serverless: `better-sqlite3` is a native module and SQLite needs persistent storage.
Set `ADMIN_PASSWORD` (bcrypt hash), `JWT_SECRET`, and `DB_PATH` via real secrets, and mount the DB
file on a persistent volume. You can also serve `frontend/dist/` as static files from Express for a
single-origin deployment. See `docs/specifications.md` §15.

---

## 7. Project structure

```
Funcle/
├── shared/        # Domain types + zod API schemas (one source of truth for both apps)
├── backend/
│   ├── server.ts        # Express app + entry point
│   ├── engine/          # Pure math: polynomial, derivative, parser (no I/O)
│   ├── routes/          # session, game, stats, admin
│   ├── middleware/      # admin JWT auth
│   ├── db/              # schema.sql + SQLite helpers
│   └── config.ts        # admin/auth config from env
├── frontend/
│   └── src/
│       ├── views/       # GameView, AdminView
│       ├── components/  # game/, input/, graph/, layout/
│       ├── stores/      # gameStore, settingsStore, adminStore (Pinia)
│       ├── api/         # typed fetch client
│       └── lib/         # curve, share, anon-id helpers
├── design/        # UI blueprint (CSS reference for the main screen)
├── math/          # Confirmed math rules
└── docs/          # specifications.md (source of truth), workflow.md (roadmap/status)
```

---

## 8. Configuration reference (`backend/.env`)

| Variable | Required | Notes |
|---|---|---|
| `PORT` | no (default 3000) | Backend HTTP port |
| `DB_PATH` | no (default `./data/funcle.db`) | SQLite file; parent dir is created automatically |
| `JWT_SECRET` | yes (prod) | Long random string used to sign admin tokens |
| `ADMIN_PASSWORD` | yes (for admin) | **bcrypt hash** of the admin password — never plaintext |

---

## 9. Status

Implemented and tested end-to-end: the full game (Daily + Free Play, 6-turn loop, win/lose
overlay, graph reveal, share) and the password-protected admin puzzle scheduler. Still planned:
optional player accounts, persistent stats with a Stats screen, Help/Settings overlays, and the
final responsive/deploy polish (Phases 7–8 in `docs/workflow.md`).
