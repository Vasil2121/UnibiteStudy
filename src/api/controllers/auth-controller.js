import bcrypt from 'bcryptjs';
import { withTransaction } from '../../database/connection.js';
import * as usersStore from '../../store/users-store.js';
import * as pointsStore from '../../store/points-store.js';

const SIGNUP_BONUS_POINTS = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUMMY_PASSWORD_HASH = '$2y$10$abcdefghijklmnopqrstuuKK7DFDb.fF3yqXyHFnEzD9Y5w/D8KGS';

export async function register(req, res, next) {
  try {
    const username = String(req.body.username ?? '').trim();
    const email = String(req.body.email ?? '').trim();
    const password = String(req.body.password ?? '');
    const fullName = String(req.body.fullName ?? '').trim();

    const fields = {};

    if (username.length < 3 || username.length > 50) {
      fields.username = 'Το όνομα χρήστη πρέπει να έχει από 3 έως 50 χαρακτήρες';
    }

    if (!EMAIL_PATTERN.test(email)) {
      fields.email = 'Απαιτείται έγκυρο email';
    }

    if (password.length < 6) {
      fields.password = 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες';
    }

    if (fullName === '') {
      fields.fullName = 'Το ονοματεπώνυμο είναι υποχρεωτικό';
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: 'Σφάλμα επικύρωσης', fields: fields });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let userId;
    try {
      userId = await withTransaction(async function (conn) {
        const insertedId = await usersStore.insertUser(conn, username, email, passwordHash, fullName);
        await pointsStore.addPoints(conn, insertedId, SIGNUP_BONUS_POINTS, 'signup_bonus');
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

    const user = await usersStore.findById(userId);
    res.status(201).json({ user: user });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const identifier = String(req.body.identifier ?? '').trim();
    const password = String(req.body.password ?? '');

    if (identifier === '' || password === '') {
      return res.status(400).json({ error: 'Σφάλμα επικύρωσης' });
    }

    let account;
    if (identifier.includes('@')) {
      account = await usersStore.findByEmail(identifier);
    } else {
      account = await usersStore.findByUsername(identifier);
    }

    let hashToCheck = DUMMY_PASSWORD_HASH;
    if (account !== null) {
      hashToCheck = account.passwordHash;
    }

    const passwordOk = await bcrypt.compare(password, hashToCheck);

    if (account === null || !passwordOk) {
      return res.status(401).json({ error: 'Λάθος στοιχεία σύνδεσης' });
    }

    req.session.userId = account.user.id;
    req.session.isAdmin = account.user.isAdmin;

    res.status(200).json({ user: account.user });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res, next) {
  try {
    req.session.destroy(function (err) {
      if (err) {
        return next(err);
      }
      res.status(200).json({ ok: true });
    });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await usersStore.findById(req.session.userId);

    if (user === null) {
      throw new Error('Session user not found');
    }

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}
