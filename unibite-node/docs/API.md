# UniBite API

Base URL for local development: `http://localhost:3000`

## Conventions

Every endpoint returns JSON. The server never returns HTML for a path under `/api`, including for unknown paths and unhandled errors.

Authentication uses a server-side session identified by the `connect.sid` cookie, which is set on a successful login or registration. Browser clients need no extra handling; command-line clients must store and resend the cookie.

Successful responses use `200`, or `201` when a row is created. Failures return an `error` field with a message intended for display to the user:

```json
{ "error": "Απαιτείται σύνδεση" }
```

Endpoints that validate several fields at once may add a `fields` object mapping a field name to its message:

```json
{
  "error": "Σφάλμα επικύρωσης",
  "fields": { "username": "Το όνομα χρήστη πρέπει να έχει από 3 έως 50 χαρακτήρες" }
}
```

Common status codes across all endpoints:

| Code | Meaning |
| --- | --- |
| 400 | The request body or a parameter is invalid, or the JSON body is malformed |
| 401 | No active session |
| 403 | Authenticated, but not permitted to act on this resource |
| 404 | The resource does not exist |
| 409 | The request conflicts with the current state of the resource |
| 500 | Unexpected server error |

Date and time values are returned as strings in MySQL format, `YYYY-MM-DD HH:MM:SS`, in the server timezone.

---

## Health

### GET /api/health

Reports whether the server is running and can reach the database. No authentication.

Response `200`:

```json
{ "ok": true, "db": "connected" }
```

Response `503` when the database is unreachable:

```json
{ "ok": true, "db": "error" }
```

---

## Authentication

### POST /api/auth/register

Creates an account, awards the registration bonus of 5 points and logs the new user in. No authentication.

Body:

| Field | Type | Rules |
| --- | --- | --- |
| `username` | string | 3 to 50 characters |
| `email` | string | valid email address |
| `password` | string | at least 6 characters |
| `fullName` | string | not empty |

```json
{
  "username": "eleni",
  "email": "eleni@upatras.gr",
  "password": "secret123",
  "fullName": "Ελένη Παπαδάκη"
}
```

Response `201`:

```json
{
  "user": {
    "id": 6,
    "username": "eleni",
    "email": "eleni@upatras.gr",
    "fullName": "Ελένη Παπαδάκη",
    "points": 5,
    "isAdmin": false
  }
}
```

| Code | Condition |
| --- | --- |
| 400 | Validation failed. The response includes `fields`. |
| 409 | The username or the email is already registered. |

The account row and the ledger entry for the bonus are written in a single transaction.

### POST /api/auth/login

Starts a session. No authentication.

Body:

| Field | Type | Description |
| --- | --- | --- |
| `identifier` | string | username or email address |
| `password` | string | the password |

Response `200`: the same `user` object as registration.

| Code | Condition |
| --- | --- |
| 400 | `identifier` or `password` is empty. |
| 401 | Unknown user or wrong password. The message is identical in both cases. |

When the identifier does not match any account, the server still performs a password comparison against a fixed dummy hash so that the response time does not reveal whether an account exists.

### POST /api/auth/logout

Destroys the session. No authentication required; calling it without a session is not an error.

Response `200`:

```json
{ "ok": true }
```

### GET /api/auth/me

Returns the authenticated user, read fresh from the database on every call so that the points balance is current.

Response `200`:

```json
{
  "id": 2,
  "username": "dimitris",
  "email": "dimitris@upatras.gr",
  "fullName": "Δημήτρης Παπαδόπουλος",
  "points": 8,
  "isAdmin": false
}
```

| Code | Condition |
| --- | --- |
| 401 | No active session. |

---

## Allergens

### GET /api/allergens

Returns the fourteen allergen categories. No authentication, as this is reference data used to build the listing form.

Response `200`:

```json
[
  { "id": 1, "name_el": "Γλουτένη", "name_en": "Gluten", "icon": "🌾" },
  { "id": 2, "name_el": "Οστρακοειδή", "name_en": "Crustaceans", "icon": "🦐" }
]
```

---

## Listings

A listing object has the following shape. `distance_km` is present only in the nearby variant of the feed.

```json
{
  "id": 1,
  "cook_id": 2,
  "cook_name": "Δημήτρης Παπαδόπουλος",
  "title": "Παστίτσιο σπιτικό",
  "description": "Φρέσκο παστίτσιο με κιμά μόσχου.",
  "photo_filename": "5a2c1e7f-....jpg",
  "portions_total": 4,
  "portions_available": 2,
  "pickup_lat": 38.2904,
  "pickup_lng": 21.7953,
  "pickup_location_text": "Φοιτητική Εστία Α΄, Πανεπιστημιούπολη Ρίο",
  "pickup_time_from": "2026-09-08 16:00:00",
  "pickup_time_to": "2026-09-08 19:00:00",
  "status": "active",
  "created_at": "2026-09-06 08:41:17",
  "expires_at": "2026-09-08 08:41:17",
  "allergens": [{ "id": 1, "name_el": "Γλουτένη", "icon": "🌾" }],
  "distance_km": 6.92
}
```

Photos are served as static files from `/uploads/<photo_filename>`.

### GET /api/listings

The public feed. Returns active, unexpired listings published by other users. The caller's own listings are excluded. Listings with no portions left are still returned, so that the interface can show them as sold out.

Query parameters. Supplying `lat` and `lng` switches the endpoint to distance mode: each listing gains a `distance_km` field, results outside the radius are removed, and the ordering changes from newest first to nearest first.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `lat` | number | — | Latitude of the reference point, -90 to 90 |
| `lng` | number | — | Longitude of the reference point, -180 to 180 |
| `radius` | number | 10 | Maximum distance in kilometres, capped at 500 |
| `limit` | integer | 50 | Maximum number of results, capped at 200 |

Response `200`:

```json
{ "listings": [] }
```

| Code | Condition |
| --- | --- |
| 400 | `lat` or `lng` is not a valid coordinate. |
| 401 | No active session. |

Distances are computed with the haversine formula inside the SQL query.

### GET /api/listings/mine

Returns every listing published by the authenticated user, including inactive and deleted ones, ordered active first and then newest first.

Response `200`: `{ "listings": [ ... ] }`

| Code | Condition |
| --- | --- |
| 401 | No active session. |

### GET /api/listings/:id

Returns a single listing regardless of its status.

Response `200`: `{ "listing": { ... } }`

| Code | Condition |
| --- | --- |
| 400 | `id` is not a positive integer. |
| 401 | No active session. |
| 404 | No listing with this id. |

### POST /api/listings

Creates a listing. The request must be `multipart/form-data` because it may carry a photo.

| Field | Type | Rules |
| --- | --- | --- |
| `title` | string | 3 to 100 characters |
| `description` | string | optional |
| `portions` | integer | 1 to 20 |
| `pickup_location_text` | string | required, at most 255 characters |
| `pickup_lat` | number | -90 to 90 |
| `pickup_lng` | number | -180 to 180 |
| `pickup_time_from` | datetime | any parseable date and time |
| `pickup_time_to` | datetime | must be later than `pickup_time_from` |
| `allergen_ids` | integer | optional, repeat the field once per allergen |
| `photo` | file | optional, JPEG, PNG or WEBP, at most 5 MB |

The listing is created with `status` set to `active` and `expires_at` set to 48 hours after creation. `portions_available` starts equal to `portions`.

Response `201`:

```json
{ "listing_id": 12 }
```

| Code | Condition |
| --- | --- |
| 400 | Validation failed, the photo is too large, its type is not allowed, or its contents are not a real image. |
| 401 | No active session. |

Uploaded files are renamed to a random identifier. The declared content type is not trusted: after the file is written, its first bytes are read and checked against the JPEG, PNG and WEBP signatures. A file that fails the check is deleted and the request is rejected. The listing row and its allergen links are written in one transaction; if it fails, the uploaded file is removed.

### PUT /api/listings/:id

Replaces the editable fields of a listing. Only the cook who published it may call this. The body uses the same fields as creation; every field must be supplied, as this is a full replacement rather than a partial update. A new `photo` replaces the previous one, which is deleted from disk after the transaction commits.

Response `200`:

```json
{ "listing_id": 12 }
```

| Code | Condition |
| --- | --- |
| 400 | `id` is invalid, validation failed, or the photo was rejected. |
| 401 | No active session. |
| 403 | The listing belongs to another user. |
| 404 | No listing with this id. |
| 409 | The listing is deleted; or it has pending or approved requests; or the new portion count is lower than the number of portions already claimed. |

### DELETE /api/listings/:id

Marks a listing as deleted. The row is never removed from the database, so that it remains available for statistics. Only the cook who published it may call this.

Response `200`:

```json
{ "listing_id": 12 }
```

| Code | Condition |
| --- | --- |
| 400 | `id` is not a positive integer. |
| 401 | No active session. |
| 403 | The listing belongs to another user. |
| 404 | No listing with this id. |
| 409 | The listing is already deleted. |

---

## Requests

A request moves through a fixed set of states:

```
pending  -> approved | rejected
approved -> picked_up | no_show
picked_up, rejected, no_show are final
```

### POST /api/requests

Requests one portion of a listing. Costs the consumer one point.

Body:

| Field | Type | Rules |
| --- | --- | --- |
| `listingId` | integer | the listing to request |
| `slot` | integer | 1 or 2 |

Response `201`:

```json
{ "request_id": 25 }
```

| Code | Condition |
| --- | --- |
| 400 | `listingId` is not a positive integer, or `slot` is not 1 or 2. |
| 401 | No active session. |
| 404 | No listing with this id. |
| 409 | The listing is not active; or it has expired; or it belongs to the caller; or the caller has fewer than one point; or the caller has already requested this slot. |

The request row and the point deduction are written in one transaction. If the caller cannot afford the point, or already holds this slot, the whole operation is rolled back and no request is created.

### GET /api/requests/mine

Returns the requests made by the authenticated user as a consumer, newest first.

Response `200`:

```json
{
  "requests": [
    {
      "id": 25,
      "listing_id": 12,
      "slot": 1,
      "status": "picked_up",
      "requested_at": "2026-09-06 18:00:00",
      "decided_at": "2026-09-06 18:10:00",
      "picked_up_at": "2026-09-06 19:02:39",
      "rate_deadline": "2026-09-08 19:02:39",
      "listing_title": "Παστίτσιο σπιτικό",
      "photo_filename": null,
      "pickup_location_text": "Φοιτητική Εστία Α΄",
      "cook_name": "Δημήτρης Παπαδόπουλος",
      "cook_username": "dimitris",
      "is_rated": false
    }
  ]
}
```

`is_rated` tells the interface whether the rating form should still be offered.

| Code | Condition |
| --- | --- |
| 401 | No active session. |

### GET /api/requests/incoming

Returns the requests made against listings published by the authenticated user, ordered by status and then newest first. Each entry adds `consumer_id`, `consumer_name`, `consumer_username` and the listing's current `portions_available`.

Response `200`: `{ "requests": [ ... ] }`

| Code | Condition |
| --- | --- |
| 401 | No active session. |

### PATCH /api/requests/:id

Moves a request to a new state. Only the cook of the related listing may call this. This single endpoint replaces the separate approve, reject, pickup and no-show operations of the original implementation.

Body:

| Field | Type | Allowed values |
| --- | --- | --- |
| `status` | string | `approved`, `rejected`, `picked_up`, `no_show` |

Response `200`:

```json
{ "request_id": 25, "status": "approved" }
```

Rejection adds `"refunded": true`. A no-show adds `"penalty_applied"`, which is `false` when the consumer had no points left to deduct.

| Code | Condition |
| --- | --- |
| 400 | `id` is invalid, or `status` is not one of the allowed values. |
| 401 | No active session. |
| 403 | The request belongs to a listing published by another user. |
| 404 | No request with this id. |
| 409 | The transition is not allowed from the current state, or approval was attempted with no portions left. |

Each transition carries a side effect, applied in the same transaction as the state change:

| Target state | Effect |
| --- | --- |
| `approved` | Reserves one portion. When the last portion is taken, the listing becomes `inactive`. |
| `rejected` | Refunds one point to the consumer. |
| `picked_up` | Records the pickup time and sets the rating deadline to 48 hours later. No points move; the cook is paid by the rating. |
| `no_show` | Charges the consumer one point and returns the portion to the listing. If the listing had gone inactive and has not expired, it becomes active again. |

The handler locks the request and its listing with `SELECT ... FOR UPDATE` before reading their state. This prevents two concurrent approvals from reserving the same last portion, and prevents a double submission from applying the same transition twice.

---

## Ratings

### POST /api/ratings

Rates a completed pickup and pays the cook. Only the consumer who made the request may call this.

Body:

| Field | Type | Rules |
| --- | --- | --- |
| `requestId` | integer | a request in the `picked_up` state belonging to the caller |
| `score` | integer | 1 to 5 |
| `comment` | string | optional |

Response `201`:

```json
{ "rating_id": 9, "request_id": 25, "cook_points_awarded": 2 }
```

| Code | Condition |
| --- | --- |
| 400 | `requestId` is not a positive integer, or `score` is outside 1 to 5. |
| 401 | No active session. |
| 403 | The request belongs to another user. |
| 404 | No request with this id. |
| 409 | The request has not been picked up; or the 48-hour rating deadline has passed; or the request has already been rated. |

The cook receives one point for any rating and a second point when the score is above 3, so a score of 2 pays 1 point and a score of 4 pays 2. The rating row and both point movements are written in one transaction. A second rating for the same request is rejected by the unique constraint on `request_id`.

---

## Profile

### GET /api/profile/transactions

Returns the authenticated user's points ledger, newest first.

Response `200`:

```json
{
  "transactions": [
    {
      "id": 29,
      "delta": 1,
      "reason": "cook_reward_base",
      "related_request_id": 4,
      "created_at": "2026-06-13 00:46:16"
    }
  ]
}
```

`reason` is returned as the raw enum value. Translating it for display is the responsibility of the client. The possible values are `signup_bonus`, `request_spent`, `request_refunded`, `pickup_completed`, `no_show_penalty`, `unrated_penalty`, `cook_reward_base` and `cook_reward_bonus`.

| Code | Condition |
| --- | --- |
| 401 | No active session. |

---

## Administration

Both endpoints require an account with `is_admin` set. A caller without a session receives `401`; a caller with a session but without the flag receives `403`.

### GET /api/admin/stats

Platform statistics.

Response `200`:

```json
{
  "period": "last_30_days",
  "portionsSharedLastMonth": 12,
  "totalUsers": 5,
  "activeListings": 3,
  "averageRating": 3.5,
  "totalRatings": 4
}
```

`portionsSharedLastMonth` counts requests that reached the `picked_up` state in the last 30 days. `activeListings` counts listings that are active and have not expired. `averageRating` is `null` when no rating has been submitted yet.

### GET /api/admin/leaderboard

Three rankings.

Response `200`:

```json
{
  "topDonors": [
    { "id": 2, "full_name": "Δημήτρης Παπαδόπουλος", "email": "dimitris@upatras.gr", "portions_shared": 4 }
  ],
  "topRated": [
    { "id": 1, "title": "Παστίτσιο σπιτικό", "cook_name": "Δημήτρης Παπαδόπουλος", "avg_score": 5, "total_ratings": 1 }
  ],
  "recentComments": [
    {
      "score": 5,
      "comment": "Φανταστικό φαγητό.",
      "rated_at": "2026-06-12 12:41:17",
      "listing_title": "Παστίτσιο σπιτικό",
      "cook_name": "Δημήτρης Παπαδόπουλος"
    }
  ]
}
```

`topDonors` ranks cooks by the number of portions actually collected, not by the number of listings published. `topRated` ranks individual meals by average score. Both lists are limited to ten entries; `recentComments` returns the five most recent non-empty comments.

---

## Unknown paths

Any request to a path under `/api` that matches no route returns:

```json
{ "error": "Η διαδρομή δεν βρέθηκε" }
```

with status `404`. Requests to paths outside `/api` are served from the `public` directory as static files.
