import pool from '../database/connection.js';

function toTransactionObject(row) {
  const transaction = {};
  transaction.id = Number(row.id);
  transaction.delta = Number(row.delta);
  transaction.reason = row.reason;
  transaction.related_request_id = row.related_request_id === null ? null : Number(row.related_request_id);
  transaction.created_at = row.created_at;
  return transaction;
}

export async function addPoints(conn, userId, delta, reason, relatedRequestId = null) {
  const result = await conn.execute(
    'UPDATE users SET points = points + ? WHERE id = ? AND points + ? >= 0',
    [delta, userId, delta]
  );
  const updateInfo = result[0];

  if (updateInfo.affectedRows === 0) {
    return false;
  }

  const transactionValues = [
    userId,
    delta,
    reason,
    relatedRequestId
  ];

  await conn.execute(
    'INSERT INTO point_transactions (user_id, delta, reason, related_request_id) VALUES (?, ?, ?, ?)',
    transactionValues
  );

  return true;
}

export async function findTransactionsByUser(userId) {
  const result = await pool.execute(
    `SELECT id, delta, reason, related_request_id, created_at
       FROM point_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC`,
    [userId]
  );
  const rows = result[0];

  return rows.map((row) => toTransactionObject(row));
}

export async function hasUnratedPenalty(conn, requestId) {
  const result = await conn.execute(
    `SELECT id FROM point_transactions
      WHERE related_request_id = ? AND reason = 'unrated_penalty'
      LIMIT 1`,
    [requestId]
  );
  const rows = result[0];

  return rows.length > 0;
}
