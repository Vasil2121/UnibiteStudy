Read `CLAUDE.md` and `docs/restructure/00-target-structure.md` first.

# Phase 04 — profile domain

`src/routes/profile.routes.js`, 31 lines.

## Move into

- `src/store/users-store.js` — **extend the existing file** from Phase 03. Add whatever profile-specific reads it needs. Do not create `profile-store.js`.
- `src/store/points-store.js` — the point-transaction history query, if the profile page shows it.
- `src/api/controllers/profile-controller.js` — this controller composes `users-store` and `points-store`.
- `src/api/routes/profile-routes.js`.

Update `src/app.js`. Delete the old route file.

## Watch for

- This is the first controller that calls **two** stores. That composition is exactly what the controller layer is for; make it obvious in the code.
- If a query already exists in `users-store.js` from Phase 03, reuse it. Do not add a near-duplicate with slightly different columns. If the columns genuinely differ, add a second clearly named function rather than parameterising the column list.

## Done when

- `profile.html` renders identically to the Phase 00 baseline: username, email, points, transaction history if present.
- `users-store.js` contains no duplicated query.
- All four grep checks pass.

## Report

Full contents of `profile-controller.js`, `profile-routes.js`, and the updated `users-store.js` and `points-store.js`.
