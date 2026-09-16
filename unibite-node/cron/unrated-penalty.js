import 'dotenv/config';
import pool from '../src/db.js';
import { withTransaction, addPoints } from '../src/points.js';

const [candidates] = await pool.query(
  `SELECT r.id, r.consumer_id, r.rate_deadline, u.username
     FROM requests r
     JOIN users u ON u.id = r.consumer_id
     LEFT JOIN ratings rt ON rt.request_id = r.id
     LEFT JOIN point_transactions pt
            ON pt.related_request_id = r.id
           AND pt.reason = 'unrated_penalty'
    WHERE r.status = 'picked_up'
      AND r.rate_deadline IS NOT NULL
      AND r.rate_deadline <= NOW()
      AND rt.id IS NULL
      AND pt.id IS NULL
    ORDER BY r.id`
);

console.log(`Υποψήφια αιτήματα προς χρέωση: ${candidates.length}`);

let penalized = 0;
let skipped = 0;
let failed = 0;

for (const candidate of candidates) {
  try {
    const applied = await withTransaction(async (conn) => {
      const [existing] = await conn.execute(
        `SELECT id FROM point_transactions
          WHERE related_request_id = ? AND reason = 'unrated_penalty'
          LIMIT 1`,
        [candidate.id]
      );

      if (existing.length > 0) {
        return false;
      }

      return addPoints(conn, candidate.consumer_id, -1, 'unrated_penalty', candidate.id);
    });

    if (applied) {
      penalized += 1;
      console.log(`  Αίτημα ${candidate.id}: χρεώθηκε 1 πόντος στον χρήστη ${candidate.username}`);
    } else {
      skipped += 1;
      console.log(`  Αίτημα ${candidate.id}: παραλείφθηκε (μηδενικό υπόλοιπο ή ήδη χρεωμένο)`);
    }
  } catch (err) {
    failed += 1;
    console.error(`  Αίτημα ${candidate.id}: σφάλμα`, err);
  }
}

console.log(`Ολοκληρώθηκε. Χρεώθηκαν: ${penalized}, παραλείφθηκαν: ${skipped}, σφάλματα: ${failed}`);

await pool.end();
process.exit(failed > 0 ? 1 : 0);
