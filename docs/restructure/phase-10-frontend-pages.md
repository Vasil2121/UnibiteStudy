Read `CLAUDE.md` and `docs/restructure/00-target-structure.md` first.

# Phase 10 — Frontend pages and module conversion

The riskiest phase: it changes what the user sees. Move one page at a time and verify each in the browser before starting the next.

## Per page

1. Create `public/js/pages/<name>.js` from the old script.
2. Replace every `fetch(` with the matching import from `js/api/`.
3. Replace duplicated helpers with imports from `js/shared/`.
4. Convert `.then()` chains to `async / await` with `try / catch`.
5. Apply style rules 1 and 2 throughout.
6. Replace the page's `<script>` tags with a single `<script type="module" src="/js/pages/<name>.js"></script>`.
7. Open the page in the browser and verify against the Phase 00 baseline.
8. Only then delete the old `public/js/<old>.js`.

## Order

Smallest and least risky first:

| # | Page | Old file | Lines |
|---|---|---|---|
| 1 | `login.html` | `login.js` | 83 |
| 2 | `register.html` | `register.js` | 96 |
| 3 | `profile.html` | `profile.js` | 85 |
| 4 | `admin/dashboard.html` | `adminDashboard.js` | 70 |
| 5 | `admin/leaderboard.html` | `adminLeaderboard.js` | 99 |
| 6 | `cook/my-listings.html` | `myListings.js` | 170 |
| 7 | `cook/inbox.html` | `inbox.js` | 175 |
| 8 | `consumer/my-requests.html` | `myRequests.js` | 161 |
| 9 | `cook/create.html` + `cook/edit.html` | `cookForm.js` | 299 |
| 10 | `consumer/feed.html` | `feedmap.js` | 341 |

`cookForm.js` serves two pages and stays one file, `pages/cook-form.js`. Both HTML files load it.

## Leaflet

On the three pages using maps, Leaflet stays a plain script tag **before** the module tag:

```html
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script type="module" src="/js/pages/consumer-feed.js"></script>
```

Classic scripts execute before modules, so the global `L` is available. Do not convert Leaflet to an import.

## Watch for

- `layout.js` currently runs on every page as a classic script and sets globals. After conversion each page imports what it needs from `shared/layout.js` and awaits it explicitly. Header rendering must not race the page's own rendering.
- `cookForm.js` branches on whether `?id=` is present in the URL. Preserve that branching exactly.
- `feedmap.js` holds three of the five nested-`.then` occurrences. It is the largest and last for that reason.
- `.forEach(slot => (slot.textContent = ''))` in `cookForm.js` is an assignment inside parentheses. Rewrite as a block body.
- Modules are deferred and run after DOM parse, so `DOMContentLoaded` wrappers may now be redundant. Remove one only where you have confirmed the page still works without it.

## Done when

- All twelve HTML pages load one module script each, plus Leaflet where needed.
- `public/js/` contains only `api/`, `shared/` and `pages/`. No loose `.js` files remain.
- `grep -rl "fetch(" public/js/pages/` returns nothing.
- `grep -rn "\.then(" public/js/` returns nothing.
- Every page matches the Phase 00 baseline behaviour.

## Report

Full contents of all ten page modules. The updated `<script>` block for each of the twelve HTML files. Both grep outputs. Anything that behaved differently and how you resolved it.
