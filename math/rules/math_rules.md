# Funcle — Confirmed Math Rules

> Authoritative record of the five math-validation rules, confirmed by the
> mathematician (source: `docs/proposal/project_proposal.md` §5; mirrored from
> `docs/specifications.md` §13 per its instruction). These drive the pure
> engine in `backend/engine/`.

| # | Rule | Confirmed answer | Implemented in |
|---|------|------------------|----------------|
| **Q1** | Max polynomial degree (n) | **3** — secrets are degree 1–3 (linear, quadratic, cubic). | `backend/engine/polynomial.ts` (`generate*`) |
| **Q2** | Coefficient range | Integers **−10..+10**; leading coefficient non-zero (may be negative). | `backend/engine/polynomial.ts` (`generate*`) |
| **Q3** | `is_inc` at f'(x)=0 | Return **`"Stationary"`**. | `backend/engine/derivative.ts` (`evaluateDirection`) |
| **Q4** | Domain for x inputs | Any integer or decimal; invalid input returns `"error"` and does **not** consume a turn. | request validation (`shared/schemas.ts`) + game routes (Task 3.2) |
| **Q5** | `target` equivalence | Accept reordered (`-4 + x^2`) and factored (`(x-2)(x+2)`) forms. Decided by **numeric sampling** at several distinct points (incl. non-integers) within epsilon — not symbolic simplification. Parser restricted to `x` + arithmetic operators; never `math.evaluate` on raw input. | `backend/engine/parser.ts` (`compileSafe`, `isEquivalent`) |

See `docs/specifications.md` §4 and §13 for full context.
