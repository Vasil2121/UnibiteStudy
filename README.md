# UniBite

UniBite is a food-sharing platform for university students. A student who has cooked more than they need publishes a listing with the number of available portions, a pickup point selected on a map, and a pickup time window. Other students browse the listings, filter them by distance, request a portion and collect it in person. Participation is regulated by a points system: requesting a portion costs one point, while cooking and receiving a good rating earns points back.

The application was originally written in PHP with server-rendered pages. It has been rewritten as a Node.js REST API with a static frontend.

## Architecture

The server returns JSON only and never renders HTML. Every page under `public/` is a static shell; the DOM is built in the browser from data fetched through the API. Session state is kept server-side in MySQL and identified by a cookie.

## Stack

- Node.js 20 or newer, Express 5, ES Modules
- MySQL / MariaDB through `mysql2` (promise API, connection pool)
- `express-session` with `express-mysql-session` for server-side sessions
- `bcryptjs` for password hashing
- `multer` for photo uploads
- `dotenv` for configuration
- Leaflet 1.9.4 with OpenStreetMap tiles and the Nominatim geocoding service on the client

## Requirements

- Node.js 20 or newer
- MySQL or MariaDB. A XAMPP installation is sufficient; only the MySQL service is required, Apache is not used.

## Installation

1. Start MySQL. In the XAMPP Control Panel, start the MySQL service. Apache does not need to be running.

2. Import the database schema. In phpMyAdmin, import `_legacy/database.sql`. This creates the `unibite` database, its seven tables and the allergen reference data.

3. Apply the migration:

   ```sql
   ALTER TABLE users ALTER points SET DEFAULT 0;
   ```

   The statement is also available in `docs/migration.sql`. See "Database migration" below for the reason.

4. Install the dependencies:

   ```
   npm install
   ```

5. Create the configuration file. Copy `.env.example` to `.env` and fill in the values:

   | Variable | Description | Local development value |
   | --- | --- | --- |
   | `DB_HOST` | MySQL host | `localhost` |
   | `DB_USER` | MySQL user | `root` |
   | `DB_PASSWORD` | MySQL password | empty for a default XAMPP installation |
   | `DB_NAME` | Database name | `unibite` |
   | `PORT` | HTTP port for the server | `3000` |
   | `SESSION_SECRET` | Random string used to sign session cookies | any long random string |

6. Set passwords for the seed users. The imported data contains placeholder password hashes. To set the password of `admin`, `dimitris`, `maria` and `giannis` to `test1234`, run:

   ```
   node scripts/generate-hashes.js
   ```

   The script prints four `UPDATE` statements; run them in phpMyAdmin.

7. Start the server:

   ```
   npm run dev
   ```

   The application is served at `http://localhost:3000`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the server with nodemon, restarting on file changes |
| `npm start` | Starts the server with node |
| `npm run cron:expire` | Marks expired listings as deleted |
| `npm run cron:unrated` | Charges the penalty for pickups that were never rated |

## API endpoints

All paths are relative to `http://localhost:3000`. Full request and response documentation is in `docs/API.md`.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/health` | public |
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | public |
| GET | `/api/auth/me` | authenticated |
| GET | `/api/allergens` | public |
| GET | `/api/listings` | authenticated |
| GET | `/api/listings/mine` | authenticated |
| GET | `/api/listings/:id` | authenticated |
| POST | `/api/listings` | authenticated |
| PUT | `/api/listings/:id` | owner of the listing |
| DELETE | `/api/listings/:id` | owner of the listing |
| POST | `/api/requests` | authenticated |
| GET | `/api/requests/mine` | authenticated |
| GET | `/api/requests/incoming` | authenticated |
| PATCH | `/api/requests/:id` | cook of the related listing |
| POST | `/api/ratings` | consumer of the related request |
| GET | `/api/profile/transactions` | authenticated |
| GET | `/api/admin/stats` | administrator |
| GET | `/api/admin/leaderboard` | administrator |

## Database schema

Seven tables.

**users** — accounts. Holds `username` and `email` (both unique), `password_hash`, `full_name`, the current `points` balance and the `is_admin` flag.

**listings** — published meals. References `users` through `cook_id`. Holds the title, optional description and photo filename, `portions_total` and `portions_available`, the pickup coordinates and free-text location, the pickup time window, a `status` of `active`, `inactive` or `deleted`, and `expires_at`. A listing expires 48 hours after it is created.

**allergens** — the fourteen EU allergen categories, with a Greek name, an English name and an icon. Reference data, not modified by the application.

**listing_allergens** — many-to-many link between `listings` and `allergens`. The primary key is the pair of columns, so the same allergen cannot be attached twice to a listing.

**requests** — a request by a consumer for one portion of a listing. References `listings` and `users`. Holds `slot` (1 or 2), a `status` of `pending`, `approved`, `rejected`, `picked_up` or `no_show`, and the timestamps `requested_at`, `decided_at`, `picked_up_at` and `rate_deadline`. A unique constraint on `(listing_id, consumer_id, slot)` prevents the same consumer from requesting the same slot twice.

**ratings** — one rating per completed pickup. References `requests` through a unique `request_id`, so a request can be rated only once. Holds a `score` from 1 to 5 and an optional comment.

**point_transactions** — the ledger of every points movement. References `users` and, where applicable, the `requests` row that caused it. Holds the signed `delta` and a `reason` drawn from a fixed set: `signup_bonus`, `request_spent`, `request_refunded`, `pickup_completed`, `no_show_penalty`, `unrated_penalty`, `cook_reward_base`, `cook_reward_bonus`.

Deleting a user cascades to their listings, requests and ledger entries. Deleting a listing cascades to its requests and allergen links. Deleting a request cascades to its rating and sets `related_request_id` to NULL in the ledger.

## Points system

The ledger in `point_transactions` is the single source of truth for a user's balance. Every change goes through the `addPoints` function in `src/points.js`, which updates `users.points` and writes the matching ledger row in the same statement pair. The update is guarded by `WHERE points + ? >= 0`, so a balance can never become negative; when the guard rejects the update, the function reports failure instead of writing a ledger row.

| Event | Change |
| --- | --- |
| Registration | +5 to the new user |
| Requesting a portion | -1 to the consumer |
| Request rejected by the cook | +1 back to the consumer |
| Consumer marked as a no-show | -1 to the consumer |
| Rating submitted | +1 to the cook |
| Rating submitted with a score above 3 | +1 more to the cook |
| Pickup not rated within 48 hours | -1 to the consumer |

Operations that change points and other tables together run inside a transaction, so a failure anywhere rolls back the whole operation, including the points movement.

## Database migration

The original schema declared `points DEFAULT 5` on the `users` table while the registration code also recorded a `signup_bonus` of +5 in the ledger. Both mechanisms represented the same event, so new users ended up with a balance twice the value recorded in the ledger. The migration sets the column default to 0, which makes `addPoints` the only way to acquire points and keeps `point_transactions` consistent with `users.points`.

## Scheduled tasks

Two maintenance scripts live in `cron/`. Neither is started by the server; both are intended to be run periodically by the operating system scheduler, for example hourly through Windows Task Scheduler.

`cron/expire-listings.js` sets the status of any `active` or `inactive` listing whose `expires_at` has passed to `deleted`.

`cron/unrated-penalty.js` finds pickups whose 48-hour rating deadline has passed, that were never rated and that have not already been penalised, and charges the consumer one point. The check for an existing `unrated_penalty` row in the ledger makes the script safe to run repeatedly: a request is never penalised twice.

When configuring a scheduled task on Windows, set the "Start in" directory to the project root. Without it the script cannot locate the `.env` file and fails to connect to the database.

## Project layout

```
cron/               maintenance scripts, run by the system scheduler
docs/               migration SQL and API documentation
public/             static frontend served by Express
  css/              stylesheets
  js/               page scripts
  uploads/          uploaded listing photos
scripts/            one-off developer utilities
src/
  app.js            Express application setup
  db.js             MySQL connection pool
  points.js         addPoints and the transaction helper
  upload.js         multer configuration and image verification
  middleware/       authentication guards
  routes/           API route handlers
_legacy/            the original PHP implementation, kept for reference
server.js           entry point
```
