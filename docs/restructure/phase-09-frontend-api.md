Read `CLAUDE.md` and `docs/restructure/00-target-structure.md` first.

# Phase 09 — Frontend api and shared layers

Create the two new frontend layers. **Do not touch the existing page scripts or any HTML.** The old `public/js/*.js` files keep running from their current locations throughout this phase. Nothing the user sees changes.

## Create `public/js/api/`

`http.js` first — everything else depends on it:

```js
export async function request(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.error);
        error.status = response.status;
        error.fields = data.fields;
        throw error;
    }

    return data;
}
```

This replaces the `.then(response => response.json().then(data => ({ response, data })))` pattern that currently appears five times across `feedmap.js` and `myRequests.js`.

Then one file per backend domain — `auth-api.js`, `listings-api.js`, `requests-api.js`, `ratings-api.js`, `allergens-api.js`, `profile-api.js`, `admin-api.js` — each exporting one named `async function` per endpoint:

```js
import { request } from './http.js';

export async function fetchMyRequests() {
    return request('/api/requests/mine');
}

export async function updateRequestStatus(requestId, status) {
    return request('/api/requests/' + requestId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status })
    });
}
```

Photo upload sends `FormData` and must **not** set `Content-Type` — the browser sets the multipart boundary itself. Handle that inside `listings-api.js`.

`geocode-api.js` wraps the two Nominatim calls. It is the only file allowed to reference an external domain.

To build this set, read every `fetch(` call in the current `public/js/` and derive the endpoint list from what the pages actually use. Cross-check against `docs/API.md`.

## Create `public/js/shared/`

- `escape.js` — `escapeHtml`, one copy. It currently exists in both `js/escape.js` and inside `js/layout.js:16`.
- `format.js` — MySQL datetime formatting, currently duplicated across four page scripts. Include the `[date, time] = value.split(' ')` logic rewritten without destructuring.
- `alerts.js` — success and error message display, extracted from whatever the pages do today.
- `form-errors.js` — renders the server's `fields` object onto form inputs.
- `map.js` — Leaflet init and marker placement, **only if** the `feedmap.js` and `cookForm.js` uses are genuinely identical. If they differ, leave them separate and say so in your report.
- `layout.js` — header, nav, current user, and the logout button handler folded in from `js/logout.js`. Replace `window.currentUserReady` and `window.currentUser` with a proper exported async function. **If any page depends on that global timing in a way you cannot reproduce exactly, stop and report instead of guessing.**

## Done when

- Every file in `public/js/api/` and `public/js/shared/` exists and is syntactically valid.
- `grep -rl "document\." public/js/api/` returns nothing.
- The app still runs exactly as before, because nothing imports the new files yet.
- Old `public/js/*.js` files are untouched.

## Report

Full contents of `http.js` and all `*-api.js` and `shared/*.js` files. A table mapping every current `fetch(` call site to its new api function. Whether the two Leaflet uses turned out identical, with evidence.
