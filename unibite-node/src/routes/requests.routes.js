import { Router } from 'express';
import pool from '../db.js';
import { withTransaction, addPoints } from '../points.js';
import { requireLogin } from '../middleware/auth.js';

const router = Router();

const ALLOWED_TRANSITIONS = {
  pending: ['approved', 'rejected'],
  approved: ['picked_up', 'no_show'],
  picked_up: [],
  rejected: [],
  no_show: []
};

const REQUEST_STATUSES = Object.keys(ALLOWED_TRANSITIONS);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function sendError(res, err) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}

router.post('/', requireLogin, async (req, res, next) => {
  try {
    const listingId = parseId(req.body.listingId);
    const slot = Number(req.body.slot);

    if (listingId === null) {
      return res.status(400).json({ error: 'Μη έγκυρο αναγνωριστικό αγγελίας' });
    }

    if (slot !== 1 && slot !== 2) {
      return res.status(400).json({ error: 'Η μερίδα πρέπει να είναι 1 ή 2' });
    }

    const [listingRows] = await pool.execute(
      `SELECT cook_id, status, expires_at > NOW() AS is_live
         FROM listings
        WHERE id = ?
        LIMIT 1`,
      [listingId]
    );

    const listing = listingRows[0];

    if (!listing) {
      return res.status(404).json({ error: 'Η αγγελία δεν βρέθηκε' });
    }

    if (listing.status !== 'active') {
      return res.status(409).json({ error: 'Η αγγελία δεν είναι πλέον ενεργή' });
    }

    if (!Number(listing.is_live)) {
      return res.status(409).json({ error: 'Η αγγελία έχει λήξει' });
    }

    if (Number(listing.cook_id) === req.session.userId) {
      return res.status(409).json({ error: 'Δεν μπορείς να ζητήσεις μερίδα από τη δική σου αγγελία' });
    }

    const requestId = await withTransaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO requests (listing_id, consumer_id, slot, status)
         VALUES (?, ?, ?, 'pending')`,
        [listingId, req.session.userId, slot]
      );

      const insertedId = result.insertId;
      const pointSpent = await addPoints(conn, req.session.userId, -1, 'request_spent', insertedId);

      if (!pointSpent) {
        throw new HttpError(409, 'Δεν έχεις αρκετούς πόντους');
      }

      return insertedId;
    });

    res.status(201).json({ request_id: requestId });
  } catch (err) {
    if (sendError(res, err)) {
      return;
    }

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Έχεις ήδη ζητήσει αυτή τη μερίδα' });
    }

    next(err);
  }
});

router.get('/mine', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.id, r.listing_id, r.slot, r.status,
              r.requested_at, r.decided_at, r.picked_up_at, r.rate_deadline,
              l.title AS listing_title,
              l.photo_filename,
              l.pickup_location_text,
              u.full_name AS cook_name,
              u.username AS cook_username,
              rt.id AS rating_id
         FROM requests r
         JOIN listings l ON l.id = r.listing_id
         JOIN users u ON u.id = l.cook_id
         LEFT JOIN ratings rt ON rt.request_id = r.id
        WHERE r.consumer_id = ?
        ORDER BY r.requested_at DESC`,
      [req.session.userId]
    );

    const requests = rows.map((row) => {
      const { rating_id, ...rest } = row;

      return {
        ...rest,
        id: Number(row.id),
        listing_id: Number(row.listing_id),
        slot: Number(row.slot),
        is_rated: rating_id !== null
      };
    });

    res.status(200).json({ requests });
  } catch (err) {
    next(err);
  }
});

router.get('/incoming', requireLogin, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.id, r.listing_id, r.consumer_id, r.slot, r.status,
              r.requested_at, r.decided_at, r.picked_up_at, r.rate_deadline,
              l.title AS listing_title,
              l.portions_available,
              u.full_name AS consumer_name,
              u.username AS consumer_username
         FROM requests r
         JOIN listings l ON l.id = r.listing_id
         JOIN users u ON u.id = r.consumer_id
        WHERE l.cook_id = ?
        ORDER BY FIELD(r.status, 'pending', 'approved', 'picked_up', 'no_show', 'rejected'),
                 r.requested_at DESC`,
      [req.session.userId]
    );

    const requests = rows.map((row) => ({
      ...row,
      id: Number(row.id),
      listing_id: Number(row.listing_id),
      consumer_id: Number(row.consumer_id),
      slot: Number(row.slot),
      portions_available: Number(row.portions_available)
    }));

    res.status(200).json({ requests });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireLogin, async (req, res, next) => {
  try {
    const requestId = parseId(req.params.id);

    if (requestId === null) {
      return res.status(400).json({ error: 'Μη έγκυρο αναγνωριστικό αιτήματος' });
    }

    const nextStatus = String(req.body.status ?? '');

    if (!REQUEST_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: 'Μη έγκυρη κατάσταση αιτήματος' });
    }

    const outcome = await withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        `SELECT r.status, r.consumer_id, r.listing_id,
                l.cook_id, l.portions_available,
                l.status AS listing_status
           FROM requests r
           JOIN listings l ON l.id = r.listing_id
          WHERE r.id = ?
          FOR UPDATE`,
        [requestId]
      );

      const current = rows[0];

      if (!current) {
        throw new HttpError(404, 'Το αίτημα δεν βρέθηκε');
      }

      if (Number(current.cook_id) !== req.session.userId) {
        throw new HttpError(403, 'Το αίτημα δεν αφορά δική σου αγγελία');
      }

      if (!ALLOWED_TRANSITIONS[current.status].includes(nextStatus)) {
        throw new HttpError(409, `Δεν επιτρέπεται μετάβαση από '${current.status}' σε '${nextStatus}'`);
      }

      const listingId = Number(current.listing_id);
      const consumerId = Number(current.consumer_id);
      const portionsAvailable = Number(current.portions_available);

      if (nextStatus === 'approved') {
        if (portionsAvailable <= 0) {
          throw new HttpError(409, 'Δεν υπάρχουν διαθέσιμες μερίδες');
        }

        await conn.execute(
          'UPDATE listings SET portions_available = portions_available - 1 WHERE id = ?',
          [listingId]
        );

        await conn.execute(
          "UPDATE requests SET status = 'approved', decided_at = NOW() WHERE id = ?",
          [requestId]
        );

        if (portionsAvailable - 1 === 0) {
          await conn.execute(
            "UPDATE listings SET status = 'inactive' WHERE id = ? AND status = 'active'",
            [listingId]
          );
        }

        return { status: nextStatus };
      }

      if (nextStatus === 'rejected') {
        await conn.execute(
          "UPDATE requests SET status = 'rejected', decided_at = NOW() WHERE id = ?",
          [requestId]
        );

        const refunded = await addPoints(conn, consumerId, 1, 'request_refunded', requestId);

        if (!refunded) {
          throw new HttpError(500, 'Η επιστροφή του πόντου απέτυχε');
        }

        return { status: nextStatus, refunded: true };
      }

      if (nextStatus === 'picked_up') {
        await conn.execute(
          `UPDATE requests
              SET status = 'picked_up',
                  picked_up_at = NOW(),
                  rate_deadline = DATE_ADD(NOW(), INTERVAL 48 HOUR)
            WHERE id = ?`,
          [requestId]
        );

        return { status: nextStatus };
      }

      await conn.execute("UPDATE requests SET status = 'no_show' WHERE id = ?", [requestId]);

      const penaltyApplied = await addPoints(conn, consumerId, -1, 'no_show_penalty', requestId);

      await conn.execute(
        'UPDATE listings SET portions_available = portions_available + 1 WHERE id = ?',
        [listingId]
      );

      await conn.execute(
        `UPDATE listings
            SET status = 'active'
          WHERE id = ?
            AND status = 'inactive'
            AND expires_at > NOW()`,
        [listingId]
      );

      return { status: nextStatus, penalty_applied: penaltyApplied };
    });

    res.status(200).json({ request_id: requestId, ...outcome });
  } catch (err) {
    if (sendError(res, err)) {
      return;
    }

    next(err);
  }
});

export default router;
