# Target structure

Permanent reference for the restructure. Read alongside `CLAUDE.md`.

## Backend

```
unibite-node/
├── server.js
├── src/
│   ├── app.js
│   ├── database/
│   │   ├── connection.js
│   │   ├── schema.sql
│   │   └── seed.sql
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth-routes.js
│   │   │   ├── allergens-routes.js
│   │   │   ├── listings-routes.js
│   │   │   ├── requests-routes.js
│   │   │   ├── ratings-routes.js
│   │   │   ├── admin-routes.js
│   │   │   └── profile-routes.js
│   │   └── controllers/
│   │       ├── auth-controller.js
│   │       ├── allergens-controller.js
│   │       ├── listings-controller.js
│   │       ├── requests-controller.js
│   │       ├── ratings-controller.js
│   │       ├── admin-controller.js
│   │       └── profile-controller.js
│   ├── store/
│   │   ├── users-store.js
│   │   ├── listings-store.js
│   │   ├── requests-store.js
│   │   ├── ratings-store.js
│   │   ├── allergens-store.js
│   │   ├── points-store.js
│   │   └── admin-store.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── upload.js
│   │   └── error-handler.js
│   └── utils/
│       ├── http-error.js
│       ├── date.js
│       └── validation.js
├── cron/
│   ├── expire-listings.js
│   └── unrated-penalty.js
├── public/
├── scripts/
│   └── generate-hashes.js
├── docs/
└── _legacy/
```

One store per **table**, not per route. `auth` and `profile` both read `users`, so both use `users-store.js`. `admin-store.js` is the deliberate exception: its aggregate queries span four tables and belong to no single one.

## Frontend

```
public/
├── index.html
├── login.html
├── register.html
├── profile.html
├── consumer/
│   ├── feed.html
│   └── my-requests.html
├── cook/
│   ├── create.html
│   ├── edit.html
│   ├── inbox.html
│   └── my-listings.html
├── admin/
│   ├── dashboard.html
│   └── leaderboard.html
├── css/                              unchanged
│   ├── variables.css
│   ├── common.css
│   ├── header-footer.css
│   ├── consumer-feed.css
│   ├── consumer-requests.css
│   └── cook.css
├── uploads/                          unchanged
└── js/
    ├── api/
    │   ├── http.js
    │   ├── auth-api.js
    │   ├── listings-api.js
    │   ├── requests-api.js
    │   ├── ratings-api.js
    │   ├── allergens-api.js
    │   ├── profile-api.js
    │   ├── admin-api.js
    │   └── geocode-api.js
    ├── shared/
    │   ├── escape.js
    │   ├── format.js
    │   ├── layout.js
    │   ├── alerts.js
    │   ├── form-errors.js
    │   └── map.js
    └── pages/
        ├── login.js
        ├── register.js
        ├── profile.js
        ├── consumer-feed.js
        ├── consumer-my-requests.js
        ├── cook-form.js
        ├── cook-inbox.js
        ├── cook-my-listings.js
        ├── admin-dashboard.js
        └── admin-leaderboard.js
```

`js/api/` on the client plays the role `store/` plays on the server: the only place that knows how to talk to the other side.

## Backend migration map

| Current | Target |
|---|---|
| `src/db.js` | `src/database/connection.js` |
| `src/points.js` → `withTransaction()` | `src/database/connection.js` |
| `src/points.js` → `addPoints()` | `src/store/points-store.js` |
| `src/upload.js` | `src/middleware/upload.js` |
| `src/middleware/auth.js` | unchanged path |
| error handler inside `src/app.js` | `src/middleware/error-handler.js` |
| `HttpError` class | `src/utils/http-error.js` |
| `toMysqlDateTime` | `src/utils/date.js` |
| `parseListingId`, `parseAllergenIds` | `src/utils/validation.js` |
| `normalizeListing`, `attachAllergens` | `src/store/listings-store.js` |
| `ALLOWED_TRANSITIONS` state machine | `src/api/controllers/requests-controller.js` |
| `docs/migration.sql` + `_legacy/database.sql` | `src/database/schema.sql` + `seed.sql` |
| every `router.x()` in `src/routes/*.routes.js` | `src/api/routes/*-routes.js` |
| every `async (req, res, next) =>` handler | `src/api/controllers/*-controller.js` |
| every `pool.execute(SQL, params)` | `src/store/*-store.js` |

## Frontend migration map

| Current | Lines | Target |
|---|---|---|
| `js/escape.js` + duplicate inside `js/layout.js` | 8 | `js/shared/escape.js` (one copy) |
| `js/layout.js` header, nav, current user | 249 | `js/shared/layout.js` |
| `js/logout.js` | 63 | folded into `js/shared/layout.js` |
| MySQL date formatting, duplicated in 4 files | — | `js/shared/format.js` |
| Leaflet setup in `feedmap.js` + `cookForm.js` | — | `js/shared/map.js` if identical |
| Nominatim calls, 2 places | — | `js/api/geocode-api.js` |
| `js/login.js` | 83 | `js/pages/login.js` |
| `js/register.js` | 96 | `js/pages/register.js` |
| `js/profile.js` | 85 | `js/pages/profile.js` |
| `js/feedmap.js` | 341 | `js/pages/consumer-feed.js` |
| `js/myRequests.js` | 161 | `js/pages/consumer-my-requests.js` |
| `js/cookForm.js` (serves create + edit) | 299 | `js/pages/cook-form.js`, kept as one file |
| `js/inbox.js` | 175 | `js/pages/cook-inbox.js` |
| `js/myListings.js` | 170 | `js/pages/cook-my-listings.js` |
| `js/adminDashboard.js` | 70 | `js/pages/admin-dashboard.js` |
| `js/adminLeaderboard.js` | 99 | `js/pages/admin-leaderboard.js` |

Every `fetch('/api/...')` call inside any of the above moves into the matching `js/api/*-api.js`.

## Phase order

| Phase | Scope | Route file lines |
|---|---|---|
| 00 | Baseline | — |
| 01 | Foundation: `database/`, `middleware/`, `utils/` | — |
| 02 | `allergens` domain | 15 |
| 03 | `auth` domain | 135 |
| 04 | `profile` domain | 31 |
| 05 | `ratings` domain | 84 |
| 06 | `requests` domain | 307 |
| 07 | `admin` domain | 114 |
| 08 | `listings` domain | 547 |
| 09 | Frontend `js/api/` and `js/shared/` | — |
| 10 | Frontend `js/pages/` and HTML module tags | — |
| 11 | Verification and confusing-concept report | — |

Smallest domain first to establish the pattern, largest last. Stop and wait for confirmation at the end of phases 00, 01, 02 and before 10.
