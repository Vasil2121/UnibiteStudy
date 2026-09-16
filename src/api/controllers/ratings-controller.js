import { withTransaction } from '../../database/connection.js';
import * as requestsStore from '../../store/requests-store.js';
import * as ratingsStore from '../../store/ratings-store.js';
import * as pointsStore from '../../store/points-store.js';

const BONUS_SCORE_THRESHOLD = 3;

export async function createRating(req, res, next) {
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

    const ratingCheck = await requestsStore.findForRating(requestId);

    if (ratingCheck === null) {
      return res.status(404).json({ error: 'Το αίτημα δεν βρέθηκε' });
    }

    if (ratingCheck.consumerId !== req.session.userId) {
      return res.status(403).json({ error: 'Το αίτημα δεν σου ανήκει' });
    }

    if (ratingCheck.status !== 'picked_up') {
      return res.status(409).json({ error: 'Μπορείς να βαθμολογήσεις μόνο μετά την παραλαβή' });
    }

    if (ratingCheck.isOverdue) {
      return res.status(409).json({ error: 'Η προθεσμία αξιολόγησης έχει λήξει' });
    }

    const cookId = ratingCheck.cookId;
    const earnsBonus = score > BONUS_SCORE_THRESHOLD;

    const ratingId = await withTransaction(async function (conn) {
      const insertedId = await ratingsStore.insertRating(conn, requestId, score, comment);

      await pointsStore.addPoints(conn, cookId, 1, 'cook_reward_base', requestId);

      if (earnsBonus) {
        await pointsStore.addPoints(conn, cookId, 1, 'cook_reward_bonus', requestId);
      }

      return insertedId;
    });

    let cookPointsAwarded = 1;
    if (earnsBonus) {
      cookPointsAwarded = 2;
    }

    res.status(201).json({
      rating_id: ratingId,
      request_id: requestId,
      cook_points_awarded: cookPointsAwarded
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Αυτή η μερίδα έχει ήδη βαθμολογηθεί' });
    }

    next(err);
  }
}
