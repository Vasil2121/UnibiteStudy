import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import pool, { testConnection } from './db.js';
import authRoutes from './routes/auth.routes.js';
import allergensRoutes from './routes/allergens.routes.js';
import listingsRoutes from './routes/listings.routes.js';
import requestsRoutes from './routes/requests.routes.js';
import ratingsRoutes from './routes/ratings.routes.js';
import adminRoutes from './routes/admin.routes.js';
import profileRoutes from './routes/profile.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore({}, pool);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
}));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/allergens', allergensRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);

app.get('/api/health', async (req, res, next) => {
  try {
    await testConnection();
    res.status(200).json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(503).json({ ok: true, db: 'error' });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Η διαδρομή δεν βρέθηκε' });
});

app.use((err, req, res, next) => {
  const status = Number(err.status);

  if (Number.isInteger(status) && status >= 400 && status < 500) {
    return res.status(status).json({ error: 'Μη έγκυρο αίτημα' });
  }

  console.error(err);
  res.status(500).json({ error: 'Σφάλμα διακομιστή' });
});

export default app;
