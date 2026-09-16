Read `CLAUDE.md` and `docs/restructure/00-target-structure.md` first.

# Phase 11 — Verification and confusing-concept report

Prove the restructure changed nothing the user can observe. **Install no test framework.**

## 1. HTTP smoke tests

Create `docs/smoke-tests.http` in IntelliJ HTTP Client format covering every endpoint in the API. For each: the happy path plus the relevant failure cases — 401 unauthenticated, 403 wrong role, 400 invalid input, 404 missing resource. Handle the session cookie so requests can run in sequence from a clean start.

Run what you can and report results per endpoint.

## 2. Cron scripts

Run `npm run cron:expire` and `npm run cron:unrated`. Both must complete and produce output in the same format recorded in the Phase 00 baseline. These run entirely through the store layer with no HTTP — that is the proof the layering holds.

## 3. Browser checklist

Produce a manual checklist and walk it: register, login, logout, browse feed, apply the distance filter, create a listing with a photo, edit a listing, request a portion, cook approves, consumer marks picked up, consumer rates the cook, points ledger reflects the change on both users, admin dashboard figures, admin leaderboard, profile page.

## 4. Layer greps

Run all four checks from `CLAUDE.md` and paste the raw output.

## 5. Ledger invariant

Query that for every user, `users.points` equals the sum of that user's `point_transactions` rows. Compare against the Phase 00 result — any user that balanced before must still balance. Users seeded with `points DEFAULT 5` and no ledger row are a known exception; they must be the same users as in the baseline.

## 6. Dead file sweep

Confirm these no longer exist: `src/db.js`, `src/points.js`, `src/upload.js`, `src/routes/`, `public/js/escape.js`, `public/js/logout.js`, and every other old loose file in `public/js/`. Confirm nothing imports from `_legacy/`.

## 7. Confusing-concept report

Present the complete list gathered across all phases. For each entry: file and line, what the construct is, why a beginner would struggle, and one of three verdicts:

- **Remove** — dead code or provably behaviour-identical simplification. List these separately and **wait for a go-ahead before deleting.**
- **Keep and explain** — genuinely necessary. Write the two-or-three-sentence explanation the student would give in an oral exam.
- **Keep as known gap** — a documented limitation, not a defect. Example: the unused `pickup_completed` value in the `point_transactions.reason` ENUM.

Do not delete anything in this phase without explicit confirmation.

## Report

Everything above, as one document. Then a short summary: what moved, what got simpler, what is still hard and why it has to be.
