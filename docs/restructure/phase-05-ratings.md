Read `CLAUDE.md` and `docs/restructure/00-target-structure.md` first.

# Phase 05 — ratings domain

`src/routes/ratings.routes.js`, 84 lines. **The first domain with a transaction.**

## Move into

- `src/store/ratings-store.js` — insert a rating, find a rating by request.
- `src/store/points-store.js` — `addPoints(conn, userId, delta, reason, relatedRequestId)` now lives here permanently. Signature unchanged.
- `src/api/controllers/ratings-controller.js`.
- `src/api/routes/ratings-routes.js`.

Update `src/app.js`. Delete the old route file.

## The transaction pattern

Submitting a rating writes the rating **and** awards points. Both or neither. The controller owns the transaction:

```js
const result = await withTransaction(async function (conn) {
    await ratingsStore.insertRating(conn, requestId, stars, comment);
    await pointsStore.addPoints(conn, cookId, 1, 'rating_received', requestId);
    return true;
});
```

Store functions taking part in a transaction accept `conn` as the **first** parameter. Store functions doing a plain read use the shared pool and take no `conn`.

## Watch for

- The eligibility checks — request exists, belongs to this consumer, status is `picked_up`, not already rated, deadline not passed — are **controller** decisions. They may query through the store, but the `if` statements live in the controller.
- `withTransaction` comes from `src/database/connection.js`, not from the old `points.js`.
- After this phase, `src/points.js` must be gone.

## Done when

- Rating a cook from `consumer/my-requests.html` works end to end.
- Rating twice still produces the same rejection as the Phase 00 baseline.
- The points ledger still balances: for every user, `users.points` equals the sum of their `point_transactions` rows.
- `src/points.js` no longer exists.
- All four grep checks pass.

## Report

Full contents of `ratings-store.js`, `points-store.js`, `ratings-controller.js`, `ratings-routes.js`. Paste the ledger balance query and its result.
