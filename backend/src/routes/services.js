import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();
router.get('/', async (_req,res,next) => {
  try { const r = await pool.query('select id,name,category,description,starting_price from services where active=true order by category,name'); res.json({ services:r.rows }); }
  catch(e) { next(e); }
});
export default router;
