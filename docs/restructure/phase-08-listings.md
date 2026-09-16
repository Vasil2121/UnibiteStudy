Read `CLAUDE.md` and `docs/restructure/00-target-structure.md` first.

# Phase 08 — listings domain

`src/routes/listings.routes.js`, 547 lines. The largest file in the project and the last backend phase.

## Move into

- `src/store/listings-store.js` — **extend** the partial file created in Phase 06. Add: nearby search, find by id, find by cook, insert, update, soft delete, plus `toListingObject(row)` absorbing the current `normalizeListing`.
- `src/store/allergens-store.js` — **extend** the Phase 02 file with the listing-allergen link functions, absorbing `attachAllergens`.
- `src/api/controllers/listings-controller.js` — validation via `src/utils/validation.js`, photo handling, the create and edit flows.
- `src/api/routes/listings-routes.js` — the photo routes carry the `uploadPhoto` middleware.

Update `src/app.js`. Delete the old route file.

## The four hard spots

**1. `LISTING_COLUMNS` and `DISTANCE_COLUMN` template constants.** The full query is currently never visible in one place; a reader has to mentally paste three constants together. Inline them so each store function contains its complete query as one readable string. Accept the repetition — style rule 3 prefers a visible query over a DRY one.

**2. The Haversine six-parameter array.** `[lat, lng, lat, userId, radius, limit]` requires counting positions to know which `?` is which. Build it as a named `const` across labelled lines. Do not change the maths; the returned distances must match the baseline to the same precision.

**3. `IN (${placeholders})` built from `ids.map(() => '?').join(',')`.** This is legitimate and safe — the placeholders are generated, never the values. Keep it. Add it to the confusing-concept list with a proposed exam explanation of why it is not SQL injection.

**4. `HAVING distance_km <= ?` instead of `WHERE`.** Correct, because a `SELECT` alias is not available in `WHERE`. Keep it. Add to the list with the explanation.

## Watch for

- Photo upload writes a file **before** the database row exists. If the insert fails, `removeUploadedFile` must still run. Preserve that cleanup path exactly.
- `detectImageType` reads magic bytes because the browser `Content-Type` is not trustworthy. This logic stays in `middleware/upload.js`, not in the store.
- The map restriction to Patra is a centred view only, not enforced server-side. Do not add enforcement. It is a documented, deliberate limitation.
- Soft delete via `listings.status = 'deleted'` must keep working with `cron/expire-listings.js`.
- `parseListingBody` returns `{ fields, values }` and is currently consumed with object destructuring in two places. Rewrite so the caller uses direct property access.

## Done when

- The feed renders the same listings in the same order, with the same distances, as the Phase 00 baseline.
- The distance filter returns identical result sets at several radii.
- Creating a listing with a photo works; creating one with an oversized or wrong-type file fails with the same Greek message.
- Editing a listing preserves its allergens.
- `npm run cron:expire` still marks the right rows.
- `src/routes/` is empty and deleted. Nothing outside `src/api/routes/` defines a route.
- All four grep checks pass across the whole backend.

## Report

Full contents of `listings-store.js`, `allergens-store.js`, `listings-controller.js`, `listings-routes.js`. A side-by-side of one feed query result before and after, showing identical rows and distances. The complete confusing-concept list gathered across phases 01 to 08 — **report only, remove nothing yet.**

**Backend is now complete. Confirm before Phase 09.**
