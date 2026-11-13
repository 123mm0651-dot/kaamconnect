import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { readFile } from 'node:fs/promises';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import serviceRoutes from './routes/services.js';
import bookingRoutes from './routes/bookings.js';
import providerRoutes from './routes/providers.js';

const app = express();
app.set('trust proxy', 1);
const origins = (process.env.CORS_ORIGIN || '').split(',').map(v => v.trim()).filter(Boolean);
app.use(cors({ origin(origin, cb) {
  if (!origin || origins.length === 0 || origins.includes(origin)) return cb(null, true);
  return cb(new Error('Origin not allowed by CORS'));
}}));
app.use(express.json({ limit: '20kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 180, standardHeaders: true, legacyHeaders: false }));
app.get('/health', async (_req, res) => {
  try { await pool.query('select 1'); res.json({ ok: true, service: 'kaamconnect-api' }); }
  catch { res.status(503).json({ ok: false }); }
});
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/providers', providerRoutes);
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

const port = process.env.PORT || 10000;
// The schema uses idempotent CREATE TABLE / INSERT statements, so it is safe
// to run at startup and ensures a fresh Render database is initialized.
const schema = await readFile(new URL('../sql/schema.sql', import.meta.url), 'utf8');
await pool.query(schema);
app.listen(port, () => console.log(`KaamConnect API listening on ${port}`));
