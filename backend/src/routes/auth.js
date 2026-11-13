import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
const tokenFor = user => jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res, next) => {
  try {
    const { fullName, email, password, phone } = req.body;
    if (!fullName?.trim() || !email?.trim() || typeof password !== 'string' || password.length < 10)
      return res.status(400).json({ error: 'Full name, email and password (at least 10 characters) are required.' });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'insert into users(full_name,email,password_hash,phone) values($1,$2,$3,$4) returning id,full_name,email,phone,role',
      [fullName.trim(), email.trim().toLowerCase(), hash, phone || null]
    );
    const user = result.rows[0];
    res.status(201).json({ user, token: tokenFor(user) });
  } catch (e) { if (e.code === '23505') return res.status(409).json({ error: 'Email is already registered.' }); next(e); }
});
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('select * from users where email=$1', [String(email || '').toLowerCase()]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password || '', user.password_hash)))
      return res.status(401).json({ error: 'Invalid email or password.' });
    const safeUser = { id:user.id, full_name:user.full_name, email:user.email, phone:user.phone, role:user.role };
    res.json({ user:safeUser, token:tokenFor(safeUser) });
  } catch (e) { next(e); }
});
router.get('/me', requireAuth, async (req,res,next) => {
  try {
    const r = await pool.query('select id,full_name,email,phone,role,created_at from users where id=$1',[req.user.id]);
    if (!r.rowCount) return res.status(404).json({ error:'Account not found.' });
    res.json({ user:r.rows[0] });
  } catch(e) { next(e); }
});
export default router;
