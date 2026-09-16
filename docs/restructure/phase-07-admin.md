Read `CLAUDE.md` and `docs/restructure/00-target-structure.md` first.

# Phase 07 — admin domain

`src/routes/admin.routes.js`, 114 lines.

## Move into

- `src/store/admin-store.js` — the aggregate and reporting queries. This is the **deliberate exception** to one-store-per-table: these queries span users, listings, requests and point_transactions and belong to no single table.
- `src/api/controllers/admin-controller.js`.
- `src/api/routes/admin-routes.js`, every route behind `requireAdmin`.

Update `src/app.js`. Delete the old route file.

## Watch for

- **Four occurrences of `const [[summary]] = await pool.query(...)`.** Double array destructuring is the single most beginner-hostile pattern in the backend. Replace each with:

```js
const summaryResult = await pool.query(sql);
const summary = summaryResult[0][0];
```

Better still, name the intermediate step so the two indexes are explained by the code:

```js
const queryResult = await pool.query(sql);
const rows = queryResult[0];
const summary = rows[0];
```

Use the three-line form. Verbosity is the point.

- The leaderboard query aggregates donors. Keep the ordering and tie-breaking exactly as they are.
- `requireAdmin` stays in the route file as middleware, never as an `if` inside the controller.

## Done when

- `admin/dashboard.html` and `admin/leaderboard.html` render identical numbers to the Phase 00 baseline. Compare figure by figure, not by eye.
- A non-admin user still gets the same 403 on every admin endpoint.
- No `[[` destructuring remains anywhere in `src/`.
- All four grep checks pass.

## Report

Full contents of `admin-store.js`, `admin-controller.js`, `admin-routes.js`. A table comparing every dashboard and leaderboard figure before and after.
