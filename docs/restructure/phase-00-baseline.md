Read `CLAUDE.md` and `docs/restructure/00-target-structure.md` first.

# Phase 00 — Baseline

Establish what currently works, before anything moves. Change **no** files in this phase.

## Do

1. Start the app with `npm run dev`. Confirm `/api/health` returns `{ ok: true, db: "connected" }`.
2. Log in through the browser and walk every page:
   - `index.html`, `login.html`, `register.html`, `profile.html`
   - `consumer/feed.html`, `consumer/my-requests.html`
   - `cook/create.html`, `cook/edit.html`, `cook/inbox.html`, `cook/my-listings.html`
   - `admin/dashboard.html`, `admin/leaderboard.html`
3. Exercise the full lifecycle once: create listing with photo → request a portion → cook approves → consumer marks picked up → consumer rates → check the points change on both users.
4. Run `npm run cron:expire` and `npm run cron:unrated`. Record the exact console output format of each.
5. Record the current points-ledger state: for every user, whether `users.points` equals the sum of that user's `point_transactions` rows. Note any user where it does not, and why.
6. Inventory the schema sources. Compare `docs/migration.sql`, `_legacy/database.sql` and the live database structure (`SHOW CREATE TABLE` for every table). List every difference.

## Report

- A table of every page: works / partially works / broken, with the symptom.
- Any pre-existing bug you find. Do not fix it. It becomes part of the baseline.
- The two cron output formats, verbatim.
- The ledger check result.
- The schema comparison, with each discrepancy listed separately.

## Do not

- Do not edit, move, create or delete any file.
- Do not fix anything you find.

**Stop and wait for confirmation before Phase 01.**
