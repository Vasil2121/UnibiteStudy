Read `CLAUDE.md` and `docs/restructure/00-target-structure.md` first.

# Phase 02 — allergens domain

The smallest domain (15 lines). Its purpose is to **establish the three-layer pattern** that all later phases copy. Get the shape right here and the rest is mechanical.

## Move

`src/routes/allergens.routes.js` splits into:

- `src/store/allergens-store.js` — the SQL, plus a private `function toAllergenObject(row)` mapper that fixes types.
- `src/api/controllers/allergens-controller.js` — named exported `async function` handlers taking `(req, res, next)`.
- `src/api/routes/allergens-routes.js` — `router.method(path, middleware, controller.handler)` lines only.

Update the mount in `src/app.js`. Delete the old route file.

## Shape to follow

Route file:

```js
import { Router } from 'express';
import { requireLogin } from '../../middleware/auth.js';
import * as allergensController from '../controllers/allergens-controller.js';

const router = Router();

router.get('/', requireLogin, allergensController.listAllergens);

export default router;
```

Controller:

```js
import * as allergensStore from '../../store/allergens-store.js';

export async function listAllergens(req, res, next) {
    try {
        const allergens = await allergensStore.findAll();
        res.status(200).json({ allergens: allergens });
    } catch (err) {
        next(err);
    }
}
```

Store:

```js
import pool from '../database/connection.js';

function toAllergenObject(row) {
    const allergen = {};
    allergen.id = Number(row.id);
    allergen.name = row.name;
    return allergen;
}

export async function findAll() {
    const result = await pool.execute(
        `SELECT id, name FROM allergens ORDER BY name`
    );
    const rows = result[0];
    return rows.map((row) => toAllergenObject(row));
}
```

Note: `const result = ...` then `const rows = result[0]` — never `const [rows] =`.

## Also add now

`src/store/allergens-store.js` will later need the listing-allergen join functions used by the listings domain. Do not add them yet; Phase 08 adds them.

## Done when

- `npm run dev` boots, `/api/health` ok.
- The allergen checkboxes still populate on `cook/create.html` and `cook/edit.html`.
- `GET /api/allergens` returns byte-identical JSON to the Phase 00 baseline.
- `grep -rlE "SELECT|INSERT|UPDATE|DELETE" src/api/` returns nothing.
- `grep -rlE "\bres\.|\breq\." src/store/` returns nothing.

## Report

Full contents of all three new files. Paste both grep outputs.

**Stop and wait for confirmation before Phase 03.** The pattern gets reviewed here once and then reused without further review.
