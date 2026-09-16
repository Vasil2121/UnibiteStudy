import pool from '../database/connection.js';

function toRatingCheckObject(row) {
  const ratingCheck = {};
  ratingCheck.consumerId = Number(row.consumer_id);
  ratingCheck.status = row.status;
  ratingCheck.cookId = Number(row.cook_id);
  ratingCheck.isOverdue = Boolean(Number(row.is_overdue));
  return ratingCheck;
}

function toConsumerRequestObject(row) {
  const request = {};
  request.id = Number(row.id);
  request.listing_id = Number(row.listing_id);
  request.slot = Number(row.slot);
  request.status = row.status;
  request.requested_at = row.requested_at;
  request.decided_at = row.decided_at;
  request.picked_up_at = row.picked_up_at;
  request.rate_deadline = row.rate_deadline;
  request.listing_title = row.listing_title;
  request.photo_filename = row.photo_filename;
  request.pickup_location_text = row.pickup_location_text;
  request.cook_name = row.cook_name;
  request.cook_username = row.cook_username;
  request.is_rated = row.existing_rating_id !== null;
  return request;
}

function toIncomingRequestObject(row) {
  const request = {};
  request.id = Number(row.id);
  request.listing_id = Number(row.listing_id);
  request.consumer_id = Number(row.consumer_id);
  request.slot = Number(row.slot);
  request.status = row.status;
  request.requested_at = row.requested_at;
  request.decided_at = row.decided_at;
  request.picked_up_at = row.picked_up_at;
  request.rate_deadline = row.rate_deadline;
  request.listing_title = row.listing_title;
  request.portions_available = Number(row.portions_available);
  request.consumer_name = row.consumer_name;
  request.consumer_username = row.consumer_username;
  return request;
}

function toLockedRequestObject(row) {
  const request = {};
  request.status = row.status;
  request.consumerId = Number(row.consumer_id);
  request.listingId = Number(row.listing_id);
  request.cookId = Number(row.cook_id);
  request.portionsAvailable = Number(row.portions_available);
  return request;
}

function toUnratedCandidateObject(row) {
  const candidate = {};
  candidate.id = Number(row.id);
  candidate.consumerId = Number(row.consumer_id);
  candidate.rateDeadline = row.rate_deadline;
  candidate.username = row.username;
  return candidate;
}

export async function findForRating(requestId) {
  const result = await pool.execute(
    `SELECT request.consumer_id, request.status, listing.cook_id,
            request.rate_deadline IS NOT NULL AND request.rate_deadline < NOW() AS is_overdue
       FROM requests AS request
       JOIN listings AS listing ON listing.id = request.listing_id
      WHERE request.id = ?
      LIMIT 1`,
    [requestId]
  );
  const rows = result[0];

  if (rows.length === 0) {
    return null;
  }

  return toRatingCheckObject(rows[0]);
}

export async function findByConsumer(consumerId) {
  const result = await pool.execute(
    `SELECT request.id, request.listing_id, request.slot, request.status,
            request.requested_at, request.decided_at, request.picked_up_at, request.rate_deadline,
            listing.title AS listing_title,
            listing.photo_filename,
            listing.pickup_location_text,
            cook.full_name AS cook_name,
            cook.username AS cook_username,
            existing_rating.id AS existing_rating_id
       FROM requests AS request
       JOIN listings AS listing ON listing.id = request.listing_id
       JOIN users AS cook ON cook.id = listing.cook_id
       LEFT JOIN ratings AS existing_rating ON existing_rating.request_id = request.id
      WHERE request.consumer_id = ?
      ORDER BY request.requested_at DESC`,
    [consumerId]
  );
  const rows = result[0];

  return rows.map((row) => toConsumerRequestObject(row));
}

export async function findIncomingForCook(cookId) {
  const result = await pool.execute(
    `SELECT request.id, request.listing_id, request.consumer_id, request.slot, request.status,
            request.requested_at, request.decided_at, request.picked_up_at, request.rate_deadline,
            listing.title AS listing_title,
            listing.portions_available,
            consumer.full_name AS consumer_name,
            consumer.username AS consumer_username
       FROM requests AS request
       JOIN listings AS listing ON listing.id = request.listing_id
       JOIN users AS consumer ON consumer.id = request.consumer_id
      WHERE listing.cook_id = ?
      ORDER BY FIELD(request.status, 'pending', 'approved', 'picked_up', 'no_show', 'rejected'),
               request.requested_at DESC`,
    [cookId]
  );
  const rows = result[0];

  return rows.map((row) => toIncomingRequestObject(row));
}

export async function findByIdForUpdate(conn, requestId) {
  const result = await conn.execute(
    `SELECT request.status, request.consumer_id, request.listing_id,
            listing.cook_id, listing.portions_available,
            listing.status AS listing_status
       FROM requests AS request
       JOIN listings AS listing ON listing.id = request.listing_id
      WHERE request.id = ?
      FOR UPDATE`,
    [requestId]
  );
  const rows = result[0];

  if (rows.length === 0) {
    return null;
  }

  return toLockedRequestObject(rows[0]);
}

export async function findUnratedPastDeadline() {
  const result = await pool.query(
    `SELECT request.id, request.consumer_id, request.rate_deadline, consumer.username
       FROM requests AS request
       JOIN users AS consumer ON consumer.id = request.consumer_id
       LEFT JOIN ratings AS rating ON rating.request_id = request.id
       LEFT JOIN point_transactions AS penalty
              ON penalty.related_request_id = request.id
             AND penalty.reason = 'unrated_penalty'
      WHERE request.status = 'picked_up'
        AND request.rate_deadline IS NOT NULL
        AND request.rate_deadline <= NOW()
        AND rating.id IS NULL
        AND penalty.id IS NULL
      ORDER BY request.id`
  );
  const rows = result[0];

  return rows.map((row) => toUnratedCandidateObject(row));
}

export async function createRequest(conn, listingId, consumerId, slot) {
  const result = await conn.execute(
    `INSERT INTO requests (listing_id, consumer_id, slot, status)
     VALUES (?, ?, ?, 'pending')`,
    [listingId, consumerId, slot]
  );
  const insertInfo = result[0];

  return insertInfo.insertId;
}

export async function markApproved(conn, requestId) {
  await conn.execute(
    "UPDATE requests SET status = 'approved', decided_at = NOW() WHERE id = ?",
    [requestId]
  );
}

export async function markRejected(conn, requestId) {
  await conn.execute(
    "UPDATE requests SET status = 'rejected', decided_at = NOW() WHERE id = ?",
    [requestId]
  );
}

export async function markPickedUp(conn, requestId) {
  await conn.execute(
    `UPDATE requests
        SET status = 'picked_up',
            picked_up_at = NOW(),
            rate_deadline = DATE_ADD(NOW(), INTERVAL 48 HOUR)
      WHERE id = ?`,
    [requestId]
  );
}

export async function markNoShow(conn, requestId) {
  await conn.execute(
    "UPDATE requests SET status = 'no_show' WHERE id = ?",
    [requestId]
  );
}

export async function countOpenForListing(listingId) {
  const result = await pool.execute(
    `SELECT COUNT(*) AS open_requests
       FROM requests
      WHERE listing_id = ?
        AND status IN ('pending', 'approved')`,
    [listingId]
  );
  const rows = result[0];
  const summary = rows[0];

  return Number(summary.open_requests);
}
