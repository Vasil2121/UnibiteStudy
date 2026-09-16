Read `CLAUDE.md` and `docs/restructure/00-target-structure.md` first.

# Phase 03 — auth domain

`src/routes/auth.routes.js`, 135 lines. Follow the pattern established in Phase 02.

## Move into

- `src/store/users-store.js` — `findByEmail`, `findByUsername`, `findById`, `insertUser`, and a private `toUserObject(row)` mapper. **This store serves both auth and profile.** Do not create an `auth-store.js`.
- `src/api/controllers/auth-controller.js` — register, login, logout, current user.
- `src/api/routes/auth-routes.js`.

Update `src/app.js`. Delete the old route file.

## Watch for

- **bcrypt stays in the controller.** Hashing and comparing are application decisions, not storage. The store receives an already-hashed string and stores it; it never calls bcrypt.
- **Session writes stay in the controller.** `req.session.userId = ...` never appears in the store.
- The duplicate-email and duplicate-username checks currently run as separate queries before the insert. Keep that behaviour exactly; do not switch to catching a MySQL duplicate-key error.
- Field-level validation errors return `{ error, fields }`. Preserve the exact Greek messages and the exact `fields` keys.
- `GET /api/auth/me` returns 401 with no body content change when logged out. The frontend `layout.js` depends on that 401 specifically.
- `points DEFAULT 5` on the users table means a freshly registered user has 5 points with no matching ledger row. Do not try to fix this. It is a known, documented trade-off.

## Done when

- `npm run dev` boots, `/api/health` ok.
- Register, login, logout all work in the browser.
- Registering with a taken email produces the same field error text as the Phase 00 baseline.
- The header still shows username and points after login.
- All four grep checks in `CLAUDE.md` still pass.

## Report

Full contents of `users-store.js`, `auth-controller.js`, `auth-routes.js`. Confirm no bcrypt or session reference exists in the store.
