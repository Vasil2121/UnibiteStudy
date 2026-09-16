Read `CLAUDE.md` and `docs/restructure/00-target-structure.md` first.

# Phase 06 — requests domain

`src/routes/requests.routes.js`, 307 lines. The second-largest domain and the one holding the state machine.

## Move into

- `src/store/requests-store.js` — create, find by consumer, find incoming for cook, find by id, `findByIdForUpdate(conn, id)` with `FOR UPDATE`, and the status-transition writes (`markApproved`, `markRejected`, `markPickedUp`, `markCancelled` or whatever the existing statuses require). Private `toRequestObject(row)` mapper.
- `src/api/controllers/requests-controller.js` — including the `ALLOWED_TRANSITIONS` map.
- `src/api/routes/requests-routes.js`.

Update `src/app.js`. Delete the old route file.

## The state machine stays in the controller

`ALLOWED_TRANSITIONS` encodes business rules, not storage. It belongs to the controller. The store exposes one write per transition and knows nothing about which transitions are legal.

## `PATCH /:id` is the hardest handler in the project

It currently runs several UPDATEs in one transaction, spanning `requests`, `listings` and `point_transactions`. After the split, the controller opens the transaction and passes `conn` into each store:

```js
const outcome = await withTransaction(async function (conn) {
    const current = await requestsStore.findByIdForUpdate(conn, requestId);
    await listingsStore.decrementPortions(conn, listingId);
    await requestsStore.markApproved(conn, requestId);
    await pointsStore.addPoints(conn, consumerId, -1, 'request_approved', requestId);
    return 'approved';
});
```

`listingsStore` does not exist yet — Phase 08 creates it. For this phase, create `src/store/listings-store.js` containing **only** the functions this controller needs (portion decrement, availability read). Phase 08 will extend the same file. Do not inline the listings SQL into `requests-store.js`.

## Watch for

- `const { rating_id, ...rest } = row` in the `/mine` handler is a rest-spread pattern that violates style rule 1. Replace it with an explicit object built property by property inside `toRequestObject`. The output object must have identical keys.
- `ORDER BY FIELD(r.status, 'pending', ...)` is MySQL-specific and non-obvious. Keep it — the ordering is user-visible — but add it to the confusing-concept list with a proposed exam explanation.
- The `LEFT JOIN ratings rt` exists only to produce a null check for "already rated". Keep the behaviour; make the intent legible through naming.
- Single-letter aliases `r`, `l`, `u`, `rt` become descriptive per style rule 3.
- The composite UNIQUE KEY that prevents double-booking a slot must keep producing the same error path.

## Done when

- The full lifecycle works: request → approve → pick up → rate.
- Rejecting and cancelling behave as in the Phase 00 baseline.
- Approving a request when portions have run out fails the same way it did before.
- The ledger still balances.
- No rest-spread remains anywhere in `src/`.
- All four grep checks pass.

## Report

Full contents of `requests-store.js`, `requests-controller.js`, `requests-routes.js`, and the partial `listings-store.js`. Show the before and after of the `{ rating_id, ...rest }` replacement side by side, and confirm the resulting object keys are identical.
