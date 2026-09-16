import { Router } from 'express';
import pool from '../db.js';
import { requireLogin } from '../middleware/auth.js';

const router = Router();

router.get('/transactions', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, delta, reason, related_request_id, created_at
         FROM point_transactions
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC`,
      [req.session.userId]
    );

    const transactions = rows.map((row) => ({
      id: Number(row.id),
      delta: Number(row.delta),
      reason: row.reason,
      related_request_id: row.related_request_id === null ? null : Number(row.related_request_id),
      created_at: row.created_at
    }));

    res.status(200).json({ transactions });
  } catch (err) {
    next(err);
  }
});

export default router;
