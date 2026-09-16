import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import pool from './database/connection.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';
import authRoutes from './api/routes/auth-routes.js';
import allergensRoutes from './api/routes/allergens-routes.js';
import listingsRoutes from './api/routes/listings-routes.js';
import requestsRoutes from './api/routes/requests-routes.js';
import ratingsRoutes from './api/routes/ratings-routes.js';
import adminRoutes from './api/routes/admin-routes.js';
import profileRoutes from './api/routes/profile-routes.js';
import healthRoutes from './api/routes/health-routes.js';

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
app.use('/api/health', healthRoutes);

app.use('/api', notFoundHandler);

app.use(errorHandler);

export default app;
