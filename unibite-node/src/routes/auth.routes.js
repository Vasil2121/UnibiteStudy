import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { withTransaction, addPoints } from '../points.js';
import { requireLogin } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const username = String(req.body.username ?? '').trim();
    const email = String(req.body.email ?? '').trim();
    const password = String(req.body.password ?? '');
    const fullName = String(req.body.fullName ?? '').trim();

    const fields = {};

    if (username.length < 3 || username.length > 50) {
      fields.username = 'Το όνομα χρήστη πρέπει να έχει από 3 έως 50 χαρακτήρες';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fields.email = 'Απαιτείται έγκυρο email';
    }

    if (password.length < 6) {
      fields.password = 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες';
    }

    if (fullName === '') {
      fields.fullName = 'Το ονοματεπώνυμο είναι υποχρεωτικό';
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: 'Σφάλμα επικύρωσης', fields });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let userId;
    try {
      userId = await withTransaction(async (conn) => {
        const [result] = await conn.execute(
          'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
          [username, email, passwordHash, fullName]
        );

        const insertedId = result.insertId;
        await addPoints(conn, insertedId, 5, 'signup_bonus');

        return insertedId;
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Το όνομα χρήστη ή το email χρησιμοποιείται ήδη' });
      }
      throw err;
    }

    req.session.userId = userId;
    req.session.isAdmin = false;

    const [rows] = await pool.execute(
      `SELECT id, username, email, full_name AS fullName, points, is_admin AS isAdmin
       FROM users WHERE id = ?`,
      [userId]
    );

    const user = rows[0];
    res.status(201).json({ user: { ...user, isAdmin: Boolean(user.isAdmin) } });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier ?? '').trim();
    const password = String(req.body.password ?? '');

    if (identifier === '' || password === '') {
      return res.status(400).json({ error: 'Σφάλμα επικύρωσης' });
    }

    const field = identifier.includes('@') ? 'email' : 'username';
    const [rows] = await pool.execute(
      `SELECT id, username, email, password_hash, full_name AS fullName, points, is_admin AS isAdmin
       FROM users WHERE ${field} = ? LIMIT 1`,
      [identifier]
    );
    const user = rows[0];

    const dummyHash = '$2y$10$abcdefghijklmnopqrstuuKK7DFDb.fF3yqXyHFnEzD9Y5w/D8KGS';
    const hashToCheck = user ? user.password_hash : dummyHash;
    const passwordOk = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordOk) {
      return res.status(401).json({ error: 'Λάθος στοιχεία σύνδεσης' });
    }

    req.session.userId = user.id;
    req.session.isAdmin = Boolean(user.isAdmin);

    delete user.password_hash;
    res.status(200).json({ user: { ...user, isAdmin: Boolean(user.isAdmin) } });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.status(200).json({ ok: true });
  });
});

router.get('/me', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, username, email, full_name AS fullName, points, is_admin AS isAdmin
       FROM users WHERE id = ?`,
      [req.session.userId]
    );

    const user = rows[0];
    res.status(200).json({ ...user, isAdmin: Boolean(user.isAdmin) });
  } catch (err) {
    next(err);
  }
});

export default router;
