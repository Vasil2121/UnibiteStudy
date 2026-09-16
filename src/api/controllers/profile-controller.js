import * as pointsStore from '../../store/points-store.js';

export async function listMyTransactions(req, res, next) {
  try {
    const transactions = await pointsStore.findTransactionsByUser(req.session.userId);
    res.status(200).json({ transactions: transactions });
  } catch (err) {
    next(err);
  }
}
