Read `CLAUDE.md` and `docs/restructure/00-target-structure.md` first.

# Phase 01 — Foundation

Create the shared layers every later phase depends on. No domain logic moves yet.

## Create `src/database/`

- `connection.js` — the pool from `src/db.js`, plus `testConnection`, plus `withTransaction` lifted out of `src/points.js`. Default export stays the pool.
- `schema.sql` — every `CREATE TABLE`, with ENUMs, indexes, unique keys and foreign keys, reconciled from the sources compared in Phase 00. **If `docs/migration.sql`, `_legacy/database.sql` and the live database disagree, stop and report. Do not pick one silently.**
- `seed.sql` — the initial rows only: allergen list, admin account, any lookup data. No user or listing test data.

## Create `src/middleware/`

- `auth.js` — unchanged, already in place.
- `upload.js` — all of `src/upload.js`: multer config, `fileFilter`, `uploadPhoto`, `detectImageType`, `removeUploadedFile`, `UPLOADS_DIR`.
- `error-handler.js` — the `(err, req, res, next)` block currently at the bottom of `src/app.js`, plus the `/api` 404 handler as a separate named export.

## Create `src/utils/`

- `http-error.js` — the `HttpError` class.
- `date.js` — `toMysqlDateTime` and the `pad` helper, converted to a `function` declaration per style rule 2.
- `validation.js` — `parseListingId`, `parseAllergenIds` and any other pure input-parsing helper currently sitting in a route file. Pure functions only; no `req`, no `res`.

## Then

- Update every import across `src/`, `cron/` and `scripts/`.
- Delete `src/db.js`, `src/upload.js` and `src/points.js` only after their contents live in the new locations. `addPoints` moves in Phase 05, so keep a temporary `src/store/points-store.js` holding it now.
- `src/app.js` shrinks: it imports the error handler and 404 handler instead of defining them.
- Route files stay exactly where they are this phase. Only their import paths change.

## Done when

- `npm run dev` boots and `/api/health` returns `{ ok: true, db: "connected" }`.
- Every page from the Phase 00 walkthrough behaves identically.
- `npm run cron:expire` and `npm run cron:unrated` produce output in the same format as the Phase 00 baseline.
- `src/db.js`, `src/upload.js` and `src/points.js` no longer exist.
- No file in `src/utils/` mentions `req` or `res`.

## Report

Full contents of `connection.js`, `error-handler.js`, `http-error.js`, `date.js`, `validation.js`, `points-store.js` and the new `app.js`. The schema reconciliation, with every decision you made and why.

**Stop and wait for confirmation before Phase 02.**
