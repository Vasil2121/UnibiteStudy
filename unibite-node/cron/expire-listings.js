import 'dotenv/config';
import pool from '../src/db.js';

const [result] = await pool.query(
  `UPDATE listings
      SET status = 'deleted'
    WHERE status IN ('active', 'inactive')
      AND expires_at <= NOW()`
);

console.log(`Έληξαν και σημάνθηκαν ως διαγραμμένες: ${result.affectedRows} αγγελίες`);

await pool.end();
process.exit(0);
