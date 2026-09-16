import { Router } from 'express';
import pool from '../db.js';
import { withTransaction } from '../points.js';
import { requireLogin } from '../middleware/auth.js';
import { uploadPhoto, detectImageType, removeUploadedFile } from '../upload.js';

const router = Router();

const DEFAULT_RADIUS_KM = 10;
const MAX_RADIUS_KM = 500;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const LISTING_COLUMNS = `l.id, l.cook_id, u.full_name AS cook_name, l.title, l.description,
       l.photo_filename, l.portions_total, l.portions_available,
       l.pickup_lat, l.pickup_lng, l.pickup_location_text,
       l.pickup_time_from, l.pickup_time_to,
       l.status, l.created_at, l.expires_at`;

const DISTANCE_COLUMN = `(6371 * acos(LEAST(1,
           cos(radians(?)) * cos(radians(l.pickup_lat)) *
           cos(radians(l.pickup_lng) - radians(?)) +
           sin(radians(?)) * sin(radians(l.pickup_lat))
       ))) AS distance_km`;

function toMysqlDateTime(raw) {
  const value = String(raw ?? '').trim();

  if (value === '') {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const pad = (number) => String(number).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function normalizeListing(row) {
  const listing = {
    ...row,
    id: Number(row.id),
    cook_id: Number(row.cook_id),
    portions_total: Number(row.portions_total),
    portions_available: Number(row.portions_available),
    pickup_lat: Number(row.pickup_lat),
    pickup_lng: Number(row.pickup_lng),
    allergens: []
  };

  if (row.distance_km !== undefined && row.distance_km !== null) {
    listing.distance_km = Number(row.distance_km);
  }

  return listing;
}

async function attachAllergens(listings) {
  if (listings.length === 0) {
    return listings;
  }

  const ids = listings.map((listing) => listing.id);
  const placeholders = ids.map(() => '?').join(',');

  const [rows] = await pool.execute(
    `SELECT la.listing_id, a.id, a.name_el, a.icon
       FROM listing_allergens la
       JOIN allergens a ON a.id = la.allergen_id
      WHERE la.listing_id IN (${placeholders})
      ORDER BY a.id`,
    ids
  );

  const listingById = new Map(listings.map((listing) => [listing.id, listing]));

  for (const row of rows) {
    const listing = listingById.get(Number(row.listing_id));

    if (listing) {
      listing.allergens.push({
        id: Number(row.id),
        name_el: row.name_el,
        icon: row.icon
      });
    }
  }

  return listings;
}

function parseListingId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseAllergenIds(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return [];
  }

  const list = Array.isArray(raw) ? raw : [raw];
  const ids = [];

  for (const value of list) {
    const id = Number(value);

    if (Number.isInteger(id) && id > 0 && !ids.includes(id)) {
      ids.push(id);
    }
  }

  return ids;
}

async function hasUnknownAllergenIds(ids) {
  if (ids.length === 0) {
    return false;
  }

  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT id FROM allergens WHERE id IN (${placeholders})`,
    ids
  );

  return rows.length !== ids.length;
}

function parseListingBody(body) {
  const fields = {};

  const title = String(body.title ?? '').trim();
  if (title.length < 3 || title.length > 100) {
    fields.title = 'Ο τίτλος πρέπει να έχει από 3 έως 100 χαρακτήρες.';
  }

  const descriptionRaw = String(body.description ?? '').trim();
  const description = descriptionRaw === '' ? null : descriptionRaw;

  const portions = Number(body.portions);
  if (!Number.isInteger(portions) || portions < 1 || portions > 20) {
    fields.portions = 'Οι μερίδες πρέπει να είναι ακέραιος από 1 έως 20.';
  }

  const pickupLocationText = String(body.pickup_location_text ?? '').trim();
  if (pickupLocationText === '') {
    fields.pickup_location_text = 'Το σημείο παραλαβής είναι υποχρεωτικό.';
  } else if (pickupLocationText.length > 255) {
    fields.pickup_location_text = 'Το σημείο παραλαβής είναι πολύ μεγάλο (μέγιστο 255 χαρακτήρες).';
  }

  const pickupLat = Number(body.pickup_lat);
  if (!Number.isFinite(pickupLat) || pickupLat < -90 || pickupLat > 90) {
    fields.pickup_lat = 'Μη έγκυρο γεωγραφικό πλάτος.';
  }

  const pickupLng = Number(body.pickup_lng);
  if (!Number.isFinite(pickupLng) || pickupLng < -180 || pickupLng > 180) {
    fields.pickup_lng = 'Μη έγκυρο γεωγραφικό μήκος.';
  }

  const pickupTimeFrom = toMysqlDateTime(body.pickup_time_from);
  if (pickupTimeFrom === null) {
    fields.pickup_time_from = 'Μη έγκυρη ώρα έναρξης παραλαβής.';
  }

  const pickupTimeTo = toMysqlDateTime(body.pickup_time_to);
  if (pickupTimeTo === null) {
    fields.pickup_time_to = 'Μη έγκυρη ώρα λήξης παραλαβής.';
  }

  if (pickupTimeFrom !== null && pickupTimeTo !== null && pickupTimeFrom >= pickupTimeTo) {
    fields.pickup_time_to = 'Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.';
  }

  return {
    fields,
    values: {
      title,
      description,
      portions,
      pickupLocationText,
      pickupLat,
      pickupLng,
      pickupTimeFrom,
      pickupTimeTo
    }
  };
}

router.get('/mine', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ${LISTING_COLUMNS}
         FROM listings l
         JOIN users u ON u.id = l.cook_id
        WHERE l.cook_id = ?
        ORDER BY FIELD(l.status, 'active', 'inactive', 'deleted'), l.created_at DESC`,
      [req.session.userId]
    );

    const listings = await attachAllergens(rows.map(normalizeListing));

    res.status(200).json({ listings });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireLogin, async (req, res, next) => {
  try {
    const listingId = parseListingId(req.params.id);

    if (listingId === null) {
      return res.status(400).json({ error: 'Μη έγκυρο αναγνωριστικό αγγελίας' });
    }

    const [rows] = await pool.execute(
      `SELECT ${LISTING_COLUMNS}
         FROM listings l
         JOIN users u ON u.id = l.cook_id
        WHERE l.id = ?
        LIMIT 1`,
      [listingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Η αγγελία δεν βρέθηκε' });
    }

    const [listing] = await attachAllergens([normalizeListing(rows[0])]);

    res.status(200).json({ listing });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireLogin, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const wantsNearby = req.query.lat !== undefined || req.query.lng !== undefined;

    let sql;
    let params;

    if (wantsNearby) {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);

      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ error: 'Μη έγκυρο γεωγραφικό πλάτος.' });
      }

      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Μη έγκυρο γεωγραφικό μήκος.' });
      }

      const requestedRadius = Number(req.query.radius);
      const radius = Number.isFinite(requestedRadius) && requestedRadius > 0
        ? Math.min(requestedRadius, MAX_RADIUS_KM)
        : DEFAULT_RADIUS_KM;

      const requestedLimit = Number(req.query.limit);
      const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, MAX_LIMIT)
        : DEFAULT_LIMIT;

      sql = `SELECT ${LISTING_COLUMNS},
       ${DISTANCE_COLUMN}
         FROM listings l
         JOIN users u ON u.id = l.cook_id
        WHERE l.cook_id != ?
          AND l.status IN ('active', 'inactive')
          AND l.expires_at > NOW()
       HAVING distance_km <= ?
        ORDER BY distance_km ASC
        LIMIT ?`;
      params = [lat, lng, lat, userId, radius, limit];
    } else {
      sql = `SELECT ${LISTING_COLUMNS}
         FROM listings l
         JOIN users u ON u.id = l.cook_id
        WHERE l.cook_id != ?
          AND l.status IN ('active', 'inactive')
          AND l.expires_at > NOW()
        ORDER BY l.created_at DESC`;
      params = [userId];
    }

    const [rows] = await pool.execute(sql, params);
    const listings = await attachAllergens(rows.map(normalizeListing));

    res.status(200).json({ listings });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireLogin, uploadPhoto, async (req, res, next) => {
  const photoFilename = req.file ? req.file.filename : null;

  try {
    if (req.file) {
      const detectedType = await detectImageType(req.file.path);

      if (detectedType === null) {
        await removeUploadedFile(photoFilename);
        const message = 'Το αρχείο δεν είναι έγκυρη εικόνα JPG, PNG ή WEBP.';
        return res.status(400).json({ error: message, fields: { photo: message } });
      }
    }

    const { fields, values } = parseListingBody(req.body);
    const allergenIds = parseAllergenIds(req.body.allergen_ids);

    if (await hasUnknownAllergenIds(allergenIds)) {
      fields.allergens = 'Ένα ή περισσότερα αλλεργιογόνα δεν είναι έγκυρα.';
    }

    if (Object.keys(fields).length > 0) {
      await removeUploadedFile(photoFilename);
      return res.status(400).json({ error: 'Σφάλμα επικύρωσης', fields });
    }

    const listingId = await withTransaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO listings
             (cook_id, title, description, photo_filename,
              portions_total, portions_available,
              pickup_lat, pickup_lng, pickup_location_text,
              pickup_time_from, pickup_time_to,
              status, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 'active', DATE_ADD(NOW(), INTERVAL 48 HOUR))`,
        [
          req.session.userId,
          values.title,
          values.description,
          photoFilename,
          values.portions,
          values.portions,
          values.pickupLat,
          values.pickupLng,
          values.pickupLocationText,
          values.pickupTimeFrom,
          values.pickupTimeTo
        ]
      );

      const insertedId = result.insertId;

      for (const allergenId of allergenIds) {
        await conn.execute(
          'INSERT INTO listing_allergens (listing_id, allergen_id) VALUES (?, ?)',
          [insertedId, allergenId]
        );
      }

      return insertedId;
    });

    res.status(201).json({ listing_id: listingId });
  } catch (err) {
    await removeUploadedFile(photoFilename);
    next(err);
  }
});

router.put('/:id', requireLogin, uploadPhoto, async (req, res, next) => {
  const newPhotoFilename = req.file ? req.file.filename : null;

  try {
    const listingId = parseListingId(req.params.id);

    if (listingId === null) {
      await removeUploadedFile(newPhotoFilename);
      return res.status(400).json({ error: 'Μη έγκυρο αναγνωριστικό αγγελίας' });
    }

    if (req.file) {
      const detectedType = await detectImageType(req.file.path);

      if (detectedType === null) {
        await removeUploadedFile(newPhotoFilename);
        const message = 'Το αρχείο δεν είναι έγκυρη εικόνα JPG, PNG ή WEBP.';
        return res.status(400).json({ error: message, fields: { photo: message } });
      }
    }

    const [existingRows] = await pool.execute(
      `SELECT cook_id, status, photo_filename, portions_total, portions_available
         FROM listings
        WHERE id = ?
        LIMIT 1`,
      [listingId]
    );

    const existing = existingRows[0];

    if (!existing) {
      await removeUploadedFile(newPhotoFilename);
      return res.status(404).json({ error: 'Η αγγελία δεν βρέθηκε' });
    }

    if (Number(existing.cook_id) !== req.session.userId) {
      await removeUploadedFile(newPhotoFilename);
      return res.status(403).json({ error: 'Η αγγελία δεν σου ανήκει' });
    }

    if (existing.status === 'deleted') {
      await removeUploadedFile(newPhotoFilename);
      return res.status(409).json({ error: 'Η αγγελία έχει διαγραφεί' });
    }

    const [requestRows] = await pool.execute(
      `SELECT COUNT(*) AS open_requests
         FROM requests
        WHERE listing_id = ?
          AND status IN ('pending', 'approved')`,
      [listingId]
    );

    if (Number(requestRows[0].open_requests) > 0) {
      await removeUploadedFile(newPhotoFilename);
      return res.status(409).json({
        error: 'Δεν μπορείς να επεξεργαστείς την αγγελία ενώ υπάρχουν εκκρεμή ή εγκεκριμένα αιτήματα.'
      });
    }

    const { fields, values } = parseListingBody(req.body);
    const allergenIds = parseAllergenIds(req.body.allergen_ids);

    if (await hasUnknownAllergenIds(allergenIds)) {
      fields.allergens = 'Ένα ή περισσότερα αλλεργιογόνα δεν είναι έγκυρα.';
    }

    if (Object.keys(fields).length > 0) {
      await removeUploadedFile(newPhotoFilename);
      return res.status(400).json({ error: 'Σφάλμα επικύρωσης', fields });
    }

    const portionsClaimed = Number(existing.portions_total) - Number(existing.portions_available);
    const newPortionsAvailable = values.portions - portionsClaimed;

    if (newPortionsAvailable < 0) {
      await removeUploadedFile(newPhotoFilename);
      return res.status(409).json({
        error: 'Δεν μπορείς να μειώσεις τις μερίδες κάτω από τον αριθμό που έχουν ήδη διεκδικηθεί.'
      });
    }

    const photoFilename = newPhotoFilename ?? existing.photo_filename;

    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE listings
            SET title                = ?,
                description          = ?,
                photo_filename       = ?,
                portions_total       = ?,
                portions_available   = ?,
                pickup_lat           = ?,
                pickup_lng           = ?,
                pickup_location_text = ?,
                pickup_time_from     = ?,
                pickup_time_to       = ?
          WHERE id = ?`,
        [
          values.title,
          values.description,
          photoFilename,
          values.portions,
          newPortionsAvailable,
          values.pickupLat,
          values.pickupLng,
          values.pickupLocationText,
          values.pickupTimeFrom,
          values.pickupTimeTo,
          listingId
        ]
      );

      await conn.execute('DELETE FROM listing_allergens WHERE listing_id = ?', [listingId]);

      for (const allergenId of allergenIds) {
        await conn.execute(
          'INSERT INTO listing_allergens (listing_id, allergen_id) VALUES (?, ?)',
          [listingId, allergenId]
        );
      }
    });

    if (newPhotoFilename && existing.photo_filename) {
      await removeUploadedFile(existing.photo_filename);
    }

    res.status(200).json({ listing_id: listingId });
  } catch (err) {
    await removeUploadedFile(newPhotoFilename);
    next(err);
  }
});

router.delete('/:id', requireLogin, async (req, res, next) => {
  try {
    const listingId = parseListingId(req.params.id);

    if (listingId === null) {
      return res.status(400).json({ error: 'Μη έγκυρο αναγνωριστικό αγγελίας' });
    }

    const [rows] = await pool.execute(
      'SELECT cook_id, status FROM listings WHERE id = ? LIMIT 1',
      [listingId]
    );

    const listing = rows[0];

    if (!listing) {
      return res.status(404).json({ error: 'Η αγγελία δεν βρέθηκε' });
    }

    if (Number(listing.cook_id) !== req.session.userId) {
      return res.status(403).json({ error: 'Η αγγελία δεν σου ανήκει' });
    }

    if (listing.status === 'deleted') {
      return res.status(409).json({ error: 'Η αγγελία έχει ήδη διαγραφεί' });
    }

    await pool.execute("UPDATE listings SET status = 'deleted' WHERE id = ?", [listingId]);

    res.status(200).json({ listing_id: listingId });
  } catch (err) {
    next(err);
  }
});

export default router;
