import pool from '../database/connection.js';

function toListingObject(row) {
  const listing = {};
  listing.id = Number(row.id);
  listing.cook_id = Number(row.cook_id);
  listing.cook_name = row.cook_name;
  listing.title = row.title;
  listing.description = row.description;
  listing.photo_filename = row.photo_filename;
  listing.portions_total = Number(row.portions_total);
  listing.portions_available = Number(row.portions_available);
  listing.pickup_lat = Number(row.pickup_lat);
  listing.pickup_lng = Number(row.pickup_lng);
  listing.pickup_location_text = row.pickup_location_text;
  listing.pickup_time_from = row.pickup_time_from;
  listing.pickup_time_to = row.pickup_time_to;
  listing.status = row.status;
  listing.created_at = row.created_at;
  listing.expires_at = row.expires_at;

  if (row.distance_km !== undefined) {
    listing.distance_km = row.distance_km === null ? null : Number(row.distance_km);
  }

  listing.allergens = [];
  return listing;
}

function toRequestableListingObject(row) {
  const listing = {};
  listing.cookId = Number(row.cook_id);
  listing.status = row.status;
  listing.isLive = Boolean(Number(row.is_live));
  return listing;
}

function toOwnerActionObject(row) {
  const listing = {};
  listing.cookId = Number(row.cook_id);
  listing.status = row.status;
  listing.photoFilename = row.photo_filename;
  listing.portionsTotal = Number(row.portions_total);
  listing.portionsAvailable = Number(row.portions_available);
  return listing;
}

export async function findFeed(userId) {
  const result = await pool.execute(
    `SELECT listing.id, listing.cook_id, cook.full_name AS cook_name, listing.title, listing.description,
            listing.photo_filename, listing.portions_total, listing.portions_available,
            listing.pickup_lat, listing.pickup_lng, listing.pickup_location_text,
            listing.pickup_time_from, listing.pickup_time_to,
            listing.status, listing.created_at, listing.expires_at
       FROM listings AS listing
       JOIN users AS cook ON cook.id = listing.cook_id
      WHERE listing.cook_id != ?
        AND listing.status IN ('active', 'inactive')
        AND listing.expires_at > NOW()
      ORDER BY listing.created_at DESC`,
    [userId]
  );
  const rows = result[0];

  return rows.map((row) => toListingObject(row));
}

export async function findNearby(userId, lat, lng, radius, limit) {
  const latitudeInCosine = lat;
  const longitudeInCosine = lng;
  const latitudeInSine = lat;
  const excludedCookId = userId;
  const maximumDistanceKm = radius;
  const maximumResults = limit;

  const nearbyValues = [
    latitudeInCosine,
    longitudeInCosine,
    latitudeInSine,
    excludedCookId,
    maximumDistanceKm,
    maximumResults
  ];

  const result = await pool.execute(
    `SELECT listing.id, listing.cook_id, cook.full_name AS cook_name, listing.title, listing.description,
            listing.photo_filename, listing.portions_total, listing.portions_available,
            listing.pickup_lat, listing.pickup_lng, listing.pickup_location_text,
            listing.pickup_time_from, listing.pickup_time_to,
            listing.status, listing.created_at, listing.expires_at,
            (6371 * acos(LEAST(1,
                cos(radians(?)) * cos(radians(listing.pickup_lat)) *
                cos(radians(listing.pickup_lng) - radians(?)) +
                sin(radians(?)) * sin(radians(listing.pickup_lat))
            ))) AS distance_km
       FROM listings AS listing
       JOIN users AS cook ON cook.id = listing.cook_id
      WHERE listing.cook_id != ?
        AND listing.status IN ('active', 'inactive')
        AND listing.expires_at > NOW()
     HAVING distance_km <= ?
      ORDER BY distance_km ASC
      LIMIT ?`,
    nearbyValues
  );
  const rows = result[0];

  return rows.map((row) => toListingObject(row));
}

export async function findByCook(cookId) {
  const result = await pool.execute(
    `SELECT listing.id, listing.cook_id, cook.full_name AS cook_name, listing.title, listing.description,
            listing.photo_filename, listing.portions_total, listing.portions_available,
            listing.pickup_lat, listing.pickup_lng, listing.pickup_location_text,
            listing.pickup_time_from, listing.pickup_time_to,
            listing.status, listing.created_at, listing.expires_at
       FROM listings AS listing
       JOIN users AS cook ON cook.id = listing.cook_id
      WHERE listing.cook_id = ?
      ORDER BY FIELD(listing.status, 'active', 'inactive', 'deleted'), listing.created_at DESC`,
    [cookId]
  );
  const rows = result[0];

  return rows.map((row) => toListingObject(row));
}

export async function findById(listingId) {
  const result = await pool.execute(
    `SELECT listing.id, listing.cook_id, cook.full_name AS cook_name, listing.title, listing.description,
            listing.photo_filename, listing.portions_total, listing.portions_available,
            listing.pickup_lat, listing.pickup_lng, listing.pickup_location_text,
            listing.pickup_time_from, listing.pickup_time_to,
            listing.status, listing.created_at, listing.expires_at
       FROM listings AS listing
       JOIN users AS cook ON cook.id = listing.cook_id
      WHERE listing.id = ?
      LIMIT 1`,
    [listingId]
  );
  const rows = result[0];

  if (rows.length === 0) {
    return null;
  }

  return toListingObject(rows[0]);
}

export async function findForRequest(listingId) {
  const result = await pool.execute(
    `SELECT cook_id, status, expires_at > NOW() AS is_live
       FROM listings
      WHERE id = ?
      LIMIT 1`,
    [listingId]
  );
  const rows = result[0];

  if (rows.length === 0) {
    return null;
  }

  return toRequestableListingObject(rows[0]);
}

export async function findForOwnerAction(listingId) {
  const result = await pool.execute(
    `SELECT cook_id, status, photo_filename, portions_total, portions_available
       FROM listings
      WHERE id = ?
      LIMIT 1`,
    [listingId]
  );
  const rows = result[0];

  if (rows.length === 0) {
    return null;
  }

  return toOwnerActionObject(rows[0]);
}

export async function insertListing(conn, cookId, photoFilename, values) {
  const listingValues = [
    cookId,
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
  ];

  const result = await conn.execute(
    `INSERT INTO listings
         (cook_id, title, description, photo_filename,
          portions_total, portions_available,
          pickup_lat, pickup_lng, pickup_location_text,
          pickup_time_from, pickup_time_to,
          status, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             'active', DATE_ADD(NOW(), INTERVAL 48 HOUR))`,
    listingValues
  );
  const insertInfo = result[0];

  return insertInfo.insertId;
}

export async function updateListing(conn, listingId, photoFilename, portionsAvailable, values) {
  const listingValues = [
    values.title,
    values.description,
    photoFilename,
    values.portions,
    portionsAvailable,
    values.pickupLat,
    values.pickupLng,
    values.pickupLocationText,
    values.pickupTimeFrom,
    values.pickupTimeTo,
    listingId
  ];

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
    listingValues
  );
}

export async function markDeleted(listingId) {
  await pool.execute("UPDATE listings SET status = 'deleted' WHERE id = ?", [listingId]);
}

export async function markExpiredAsDeleted() {
  const result = await pool.query(
    `UPDATE listings
        SET status = 'deleted'
      WHERE status IN ('active', 'inactive')
        AND expires_at <= NOW()`
  );
  const updateInfo = result[0];

  return updateInfo.affectedRows;
}

export async function decrementPortions(conn, listingId) {
  await conn.execute(
    'UPDATE listings SET portions_available = portions_available - 1 WHERE id = ?',
    [listingId]
  );
}

export async function incrementPortions(conn, listingId) {
  await conn.execute(
    'UPDATE listings SET portions_available = portions_available + 1 WHERE id = ?',
    [listingId]
  );
}

export async function markInactiveIfActive(conn, listingId) {
  await conn.execute(
    "UPDATE listings SET status = 'inactive' WHERE id = ? AND status = 'active'",
    [listingId]
  );
}

export async function reactivateIfInactive(conn, listingId) {
  await conn.execute(
    `UPDATE listings
        SET status = 'active'
      WHERE id = ?
        AND status = 'inactive'
        AND expires_at > NOW()`,
    [listingId]
  );
}
