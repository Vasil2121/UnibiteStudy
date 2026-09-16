import { Router } from 'express';
import pool from '../db.js';
import { requireLogin, requireAdmin } from '../middleware/auth.js';

const router = Router();

const LEADERBOARD_LIMIT = 10;
const RECENT_COMMENTS_LIMIT = 5;

router.get('/stats', requireLogin, requireAdmin, async (req, res, next) => {
  try {
    const [[portions]] = await pool.query(
      `SELECT COUNT(*) AS portions_shared
         FROM requests
        WHERE status = 'picked_up'
          AND picked_up_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    const [[users]] = await pool.query('SELECT COUNT(*) AS total_users FROM users');

    const [[listings]] = await pool.query(
      `SELECT COUNT(*) AS active_listings
         FROM listings
        WHERE status = 'active'
          AND expires_at > NOW()`
    );

    const [[ratings]] = await pool.query(
      'SELECT ROUND(AVG(score), 2) AS average_score, COUNT(*) AS total_ratings FROM ratings'
    );

    res.status(200).json({
      period: 'last_30_days',
      portionsSharedLastMonth: Number(portions.portions_shared),
      totalUsers: Number(users.total_users),
      activeListings: Number(listings.active_listings),
      averageRating: ratings.average_score === null ? null : Number(ratings.average_score),
      totalRatings: Number(ratings.total_ratings)
    });
  } catch (err) {
    next(err);
  }
});

router.get('/leaderboard', requireLogin, requireAdmin, async (req, res, next) => {
  try {
    const [donorRows] = await pool.execute(
      `SELECT u.id, u.full_name, u.email, COUNT(*) AS portions_shared
         FROM requests r
         JOIN listings l ON l.id = r.listing_id
         JOIN users u ON u.id = l.cook_id
        WHERE r.status = 'picked_up'
        GROUP BY u.id, u.full_name, u.email
        ORDER BY portions_shared DESC, u.full_name ASC
        LIMIT ?`,
      [LEADERBOARD_LIMIT]
    );

    const [ratedRows] = await pool.execute(
      `SELECT l.id, l.title, u.full_name AS cook_name,
              ROUND(AVG(rt.score), 2) AS avg_score,
              COUNT(rt.id) AS total_ratings
         FROM ratings rt
         JOIN requests r ON r.id = rt.request_id
         JOIN listings l ON l.id = r.listing_id
         JOIN users u ON u.id = l.cook_id
        GROUP BY l.id, l.title, u.full_name
        ORDER BY avg_score DESC, total_ratings DESC, l.title ASC
        LIMIT ?`,
      [LEADERBOARD_LIMIT]
    );

    const [commentRows] = await pool.execute(
      `SELECT rt.score, rt.comment, rt.rated_at,
              l.title AS listing_title,
              u.full_name AS cook_name
         FROM ratings rt
         JOIN requests r ON r.id = rt.request_id
         JOIN listings l ON l.id = r.listing_id
         JOIN users u ON u.id = l.cook_id
        WHERE rt.comment IS NOT NULL AND rt.comment != ''
        ORDER BY rt.rated_at DESC
        LIMIT ?`,
      [RECENT_COMMENTS_LIMIT]
    );

    res.status(200).json({
      topDonors: donorRows.map((row) => ({
        id: Number(row.id),
        full_name: row.full_name,
        email: row.email,
        portions_shared: Number(row.portions_shared)
      })),
      topRated: ratedRows.map((row) => ({
        id: Number(row.id),
        title: row.title,
        cook_name: row.cook_name,
        avg_score: Number(row.avg_score),
        total_ratings: Number(row.total_ratings)
      })),
      recentComments: commentRows.map((row) => ({
        score: Number(row.score),
        comment: row.comment,
        rated_at: row.rated_at,
        listing_title: row.listing_title,
        cook_name: row.cook_name
      }))
    });
  } catch (err) {
    next(err);
  }
});

export default router;
