import pool from './db.js';

export async function addPoints(conn, userId, delta, reason, relatedRequestId = null) {
  const [updateResult] = await conn.execute(
    'UPDATE users SET points = points + ? WHERE id = ? AND points + ? >= 0',
    [delta, userId, delta]
  );

  if (updateResult.affectedRows === 0) {
    return false;
  }

  await conn.execute(
    'INSERT INTO point_transactions (user_id, delta, reason, related_request_id) VALUES (?, ?, ?, ?)',
    [userId, delta, reason, relatedRequestId]
  );

  return true;
}

export async function withTransaction(callback) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
