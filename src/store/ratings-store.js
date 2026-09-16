export async function insertRating(conn, requestId, score, comment) {
  const result = await conn.execute(
    'INSERT INTO ratings (request_id, score, comment) VALUES (?, ?, ?)',
    [requestId, score, comment]
  );
  const insertInfo = result[0];

  return insertInfo.insertId;
}
