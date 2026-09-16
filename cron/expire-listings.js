import 'dotenv/config';
import pool from '../src/database/connection.js';
import * as listingsStore from '../src/store/listings-store.js';

const expiredCount = await listingsStore.markExpiredAsDeleted();

console.log(`Έληξαν και σημάνθηκαν ως διαγραμμένες: ${expiredCount} αγγελίες`);

await pool.end();
process.exit(0);
