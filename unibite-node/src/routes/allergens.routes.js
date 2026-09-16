import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name_el, name_en, icon FROM allergens');
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
