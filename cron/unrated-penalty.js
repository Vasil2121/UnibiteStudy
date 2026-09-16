import 'dotenv/config';
import pool, { withTransaction } from '../src/database/connection.js';
import * as requestsStore from '../src/store/requests-store.js';
import * as pointsStore from '../src/store/points-store.js';

const candidates = await requestsStore.findUnratedPastDeadline();

console.log(`Υποψήφια αιτήματα προς χρέωση: ${candidates.length}`);

let penalized = 0;
let skipped = 0;
let failed = 0;

for (const candidate of candidates) {
  try {
    const applied = await withTransaction(async function (conn) {
      const alreadyPenalized = await pointsStore.hasUnratedPenalty(conn, candidate.id);

      if (alreadyPenalized) {
        return false;
      }

      return pointsStore.addPoints(conn, candidate.consumerId, -1, 'unrated_penalty', candidate.id);
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
