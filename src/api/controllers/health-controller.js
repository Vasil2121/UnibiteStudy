import { testConnection } from '../../database/connection.js';

export async function checkHealth(req, res, next) {
  try {
    await testConnection();
    res.status(200).json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(503).json({ ok: true, db: 'error' });
  }
}
