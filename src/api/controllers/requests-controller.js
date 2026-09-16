import { withTransaction } from '../../database/connection.js';
import * as requestsStore from '../../store/requests-store.js';
import * as listingsStore from '../../store/listings-store.js';
import * as pointsStore from '../../store/points-store.js';
import { HttpError } from '../../utils/http-error.js';
import { parseId } from '../../utils/validation.js';

const ALLOWED_TRANSITIONS = {
  pending: ['approved', 'rejected'],
  approved: ['picked_up', 'no_show'],
  picked_up: [],
  rejected: [],
  no_show: []
};

const REQUEST_STATUSES = Object.keys(ALLOWED_TRANSITIONS);

function sendError(res, err) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}

async function approveRequest(conn, requestId, current) {
  if (current.portionsAvailable <= 0) {
    throw new HttpError(409, 'Δεν υπάρχουν διαθέσιμες μερίδες');
  }

  await listingsStore.decrementPortions(conn, current.listingId);
  await requestsStore.markApproved(conn, requestId);

  if (current.portionsAvailable - 1 === 0) {
    await listingsStore.markInactiveIfActive(conn, current.listingId);
  }

  return { request_id: requestId, status: 'approved' };
}

async function rejectRequest(conn, requestId, current) {
  await requestsStore.markRejected(conn, requestId);

  const refunded = await pointsStore.addPoints(conn, current.consumerId, 1, 'request_refunded', requestId);

  if (!refunded) {
    throw new HttpError(500, 'Η επιστροφή του πόντου απέτυχε');
  }

  return { request_id: requestId, status: 'rejected', refunded: true };
}

async function pickUpRequest(conn, requestId) {
  await requestsStore.markPickedUp(conn, requestId);

  return { request_id: requestId, status: 'picked_up' };
}

async function markRequestNoShow(conn, requestId, current) {
  await requestsStore.markNoShow(conn, requestId);

  const penaltyApplied = await pointsStore.addPoints(conn, current.consumerId, -1, 'no_show_penalty', requestId);

  await listingsStore.incrementPortions(conn, current.listingId);
  await listingsStore.reactivateIfInactive(conn, current.listingId);

  return { request_id: requestId, status: 'no_show', penalty_applied: penaltyApplied };
}

export async function createRequest(req, res, next) {
  try {
    const listingId = parseId(req.body.listingId);
    const slot = Number(req.body.slot);

    if (listingId === null) {
      return res.status(400).json({ error: 'Μη έγκυρο αναγνωριστικό αγγελίας' });
    }

    if (slot !== 1 && slot !== 2) {
      return res.status(400).json({ error: 'Η μερίδα πρέπει να είναι 1 ή 2' });
    }

    const listing = await listingsStore.findForRequest(listingId);

    if (listing === null) {
      return res.status(404).json({ error: 'Η αγγελία δεν βρέθηκε' });
    }

    if (listing.status !== 'active') {
      return res.status(409).json({ error: 'Η αγγελία δεν είναι πλέον ενεργή' });
    }

    if (!listing.isLive) {
      return res.status(409).json({ error: 'Η αγγελία έχει λήξει' });
    }

    if (listing.cookId === req.session.userId) {
      return res.status(409).json({ error: 'Δεν μπορείς να ζητήσεις μερίδα από τη δική σου αγγελία' });
    }

    const consumerId = req.session.userId;

    const requestId = await withTransaction(async function (conn) {
      const insertedId = await requestsStore.createRequest(conn, listingId, consumerId, slot);
      const pointSpent = await pointsStore.addPoints(conn, consumerId, -1, 'request_spent', insertedId);

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
}

export async function listMyRequests(req, res, next) {
  try {
    const requests = await requestsStore.findByConsumer(req.session.userId);
    res.status(200).json({ requests: requests });
  } catch (err) {
    next(err);
  }
}

export async function listIncomingRequests(req, res, next) {
  try {
    const requests = await requestsStore.findIncomingForCook(req.session.userId);
    res.status(200).json({ requests: requests });
  } catch (err) {
    next(err);
  }
}

export async function updateRequestStatus(req, res, next) {
  try {
    const requestId = parseId(req.params.id);

    if (requestId === null) {
      return res.status(400).json({ error: 'Μη έγκυρο αναγνωριστικό αιτήματος' });
    }

    const nextStatus = String(req.body.status ?? '');

    if (!REQUEST_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: 'Μη έγκυρη κατάσταση αιτήματος' });
    }

    const cookId = req.session.userId;

    const outcome = await withTransaction(async function (conn) {
      const current = await requestsStore.findByIdForUpdate(conn, requestId);

      if (current === null) {
        throw new HttpError(404, 'Το αίτημα δεν βρέθηκε');
      }

      if (current.cookId !== cookId) {
        throw new HttpError(403, 'Το αίτημα δεν αφορά δική σου αγγελία');
      }

      if (!ALLOWED_TRANSITIONS[current.status].includes(nextStatus)) {
        throw new HttpError(409, `Δεν επιτρέπεται μετάβαση από '${current.status}' σε '${nextStatus}'`);
      }

      if (nextStatus === 'approved') {
        return approveRequest(conn, requestId, current);
      }

      if (nextStatus === 'rejected') {
        return rejectRequest(conn, requestId, current);
      }

      if (nextStatus === 'picked_up') {
        return pickUpRequest(conn, requestId);
      }

      return markRequestNoShow(conn, requestId, current);
    });

    res.status(200).json(outcome);
  } catch (err) {
    if (sendError(res, err)) {
      return;
    }

    next(err);
  }
}
