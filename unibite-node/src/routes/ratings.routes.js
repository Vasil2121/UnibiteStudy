import { Router } from 'express';
import pool from '../db.js';
import { withTransaction, addPoints } from '../points.js';
import { requireLogin } from '../middleware/auth.js';

const router = Router();

const BONUS_SCORE_THRESHOLD = 3;

router.post('/', requireLogin, async (req, res, next) => {
  try {
    const requestId = Number(req.body.requestId);
    const score = Number(req.body.score);
    const commentRaw = String(req.body.comment ?? '').trim();
    const comment = commentRaw === '' ? null : commentRaw;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ error: 'Μη έγκυρο αναγνωριστικό αιτήματος' });
    }

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Η βαθμολογία πρέπει να είναι από 1 έως 5' });
    }

    const [rows] = await pool.execute(
      `SELECT r.consumer_id, r.status, l.cook_id,
              r.rate_deadline IS NOT NULL AND r.rate_deadline < NOW() AS is_overdue
         FROM requests r
         JOIN listings l ON l.id = r.listing_id
        WHERE r.id = ?
        LIMIT 1`,
      [requestId]
    );

    const request = rows[0];

    if (!request) {
      return res.status(404).json({ error: 'Το αίτημα δεν βρέθηκε' });
    }

    if (Number(request.consumer_id) !== req.session.userId) {
      return res.status(403).json({ error: 'Το αίτημα δεν σου ανήκει' });
    }

    if (request.status !== 'picked_up') {
      return res.status(409).json({ error: 'Μπορείς να βαθμολογήσεις μόνο μετά την παραλαβή' });
    }

    if (Number(request.is_overdue)) {
      return res.status(409).json({ error: 'Η προθεσμία αξιολόγησης έχει λήξει' });
    }

    const cookId = Number(request.cook_id);

    const ratingId = await withTransaction(async (conn) => {
      const [result] = await conn.execute(
        'INSERT INTO ratings (request_id, score, comment) VALUES (?, ?, ?)',
        [requestId, score, comment]
      );

      await addPoints(conn, cookId, 1, 'cook_reward_base', requestId);

      if (score > BONUS_SCORE_THRESHOLD) {
        await addPoints(conn, cookId, 1, 'cook_reward_bonus', requestId);
      }

      return result.insertId;
    });

    res.status(201).json({
      rating_id: ratingId,
      request_id: requestId,
      cook_points_awarded: score > BONUS_SCORE_THRESHOLD ? 2 : 1
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Αυτή η μερίδα έχει ήδη βαθμολογηθεί' });
    }

    next(err);
  }
});

export default router;
