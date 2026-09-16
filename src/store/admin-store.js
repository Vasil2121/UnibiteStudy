import pool from '../database/connection.js';

function toDonorObject(row) {
  const donor = {};
  donor.id = Number(row.id);
  donor.full_name = row.full_name;
  donor.email = row.email;
  donor.portions_shared = Number(row.portions_shared);
  return donor;
}

function toRatedListingObject(row) {
  const ratedListing = {};
  ratedListing.id = Number(row.id);
  ratedListing.title = row.title;
  ratedListing.cook_name = row.cook_name;
  ratedListing.avg_score = Number(row.avg_score);
  ratedListing.total_ratings = Number(row.total_ratings);
  return ratedListing;
}

function toCommentObject(row) {
  const comment = {};
  comment.score = Number(row.score);
  comment.comment = row.comment;
  comment.rated_at = row.rated_at;
  comment.listing_title = row.listing_title;
  comment.cook_name = row.cook_name;
  return comment;
}

export async function countPortionsSharedLastMonth() {
  const queryResult = await pool.query(
    `SELECT COUNT(*) AS portions_shared
       FROM requests
      WHERE status = 'picked_up'
        AND picked_up_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
  );
  const rows = queryResult[0];
  const summary = rows[0];

  return Number(summary.portions_shared);
}

export async function countUsers() {
  const queryResult = await pool.query('SELECT COUNT(*) AS total_users FROM users');
  const rows = queryResult[0];
  const summary = rows[0];

  return Number(summary.total_users);
}

export async function countActiveListings() {
  const queryResult = await pool.query(
    `SELECT COUNT(*) AS active_listings
       FROM listings
      WHERE status = 'active'
        AND expires_at > NOW()`
  );
  const rows = queryResult[0];
  const summary = rows[0];

  return Number(summary.active_listings);
}

export async function findRatingSummary() {
  const queryResult = await pool.query(
    'SELECT ROUND(AVG(score), 2) AS average_score, COUNT(*) AS total_ratings FROM ratings'
  );
  const rows = queryResult[0];
  const summary = rows[0];

  const ratingSummary = {};
  ratingSummary.averageScore = summary.average_score === null ? null : Number(summary.average_score);
  ratingSummary.totalRatings = Number(summary.total_ratings);
  return ratingSummary;
}

export async function findTopDonors(limit) {
  const result = await pool.execute(
    `SELECT cook.id, cook.full_name, cook.email, COUNT(*) AS portions_shared
       FROM requests AS request
       JOIN listings AS listing ON listing.id = request.listing_id
       JOIN users AS cook ON cook.id = listing.cook_id
      WHERE request.status = 'picked_up'
      GROUP BY cook.id, cook.full_name, cook.email
      ORDER BY portions_shared DESC, cook.full_name ASC
      LIMIT ?`,
    [limit]
  );
  const rows = result[0];

  return rows.map((row) => toDonorObject(row));
}

export async function findTopRatedListings(limit) {
  const result = await pool.execute(
    `SELECT listing.id, listing.title, cook.full_name AS cook_name,
            ROUND(AVG(rating.score), 2) AS avg_score,
            COUNT(rating.id) AS total_ratings
       FROM ratings AS rating
       JOIN requests AS request ON request.id = rating.request_id
       JOIN listings AS listing ON listing.id = request.listing_id
       JOIN users AS cook ON cook.id = listing.cook_id
      GROUP BY listing.id, listing.title, cook.full_name
      ORDER BY avg_score DESC, total_ratings DESC, listing.title ASC
      LIMIT ?`,
    [limit]
  );
  const rows = result[0];

  return rows.map((row) => toRatedListingObject(row));
}

export async function findRecentComments(limit) {
  const result = await pool.execute(
    `SELECT rating.score, rating.comment, rating.rated_at,
            listing.title AS listing_title,
            cook.full_name AS cook_name
       FROM ratings AS rating
       JOIN requests AS request ON request.id = rating.request_id
       JOIN listings AS listing ON listing.id = request.listing_id
       JOIN users AS cook ON cook.id = listing.cook_id
      WHERE rating.comment IS NOT NULL AND rating.comment != ''
      ORDER BY rating.rated_at DESC
      LIMIT ?`,
    [limit]
  );
  const rows = result[0];

  return rows.map((row) => toCommentObject(row));
}
