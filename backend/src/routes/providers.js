import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
const router = Router();
router.post('/apply', requireAuth, async (req,res,next) => {
  try {
    const { serviceId, serviceName, city, area, bio, experienceYears } = req.body;
    if (!serviceName || !city) return res.status(400).json({ error:'Service name and city are required.' });
    const r = await pool.query(`insert into providers(user_id,service_id,service_name,city,area,bio,experience_years)
      values($1,$2,$3,$4,$5,$6,$7)
      on conflict(user_id) do update set service_id=excluded.service_id,service_name=excluded.service_name,city=excluded.city,area=excluded.area,bio=excluded.bio,experience_years=excluded.experience_years,status='pending'
      returning *`,[req.user.id,serviceId || null,serviceName,city,area || null,bio || null,Math.max(0,Math.min(60,Number(experienceYears)||0))]);
    res.status(201).json({ provider:r.rows[0] });
  } catch(e) { next(e); }
});
router.get('/approved', async (req,res,next) => {
  try { const r=await pool.query('select p.id,p.service_name,p.city,p.area,p.bio,p.experience_years,u.full_name from providers p join users u on u.id=p.user_id where p.status=$1 order by p.created_at desc',['approved']); res.json({providers:r.rows}); }
  catch(e) { next(e); }
});
router.patch('/:id/status', requireAuth, requireRole('admin'), async (req,res,next) => {
  try {
    const allowed=['approved','rejected','suspended','pending'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({error:'Invalid provider status.'});
    const r=await pool.query('update providers set status=$1,reviewed_at=now(),reviewed_by=$2 where id=$3 returning *',[req.body.status,req.user.id,req.params.id]);
    if (!r.rowCount) return res.status(404).json({error:'Provider not found.'});
    res.json({provider:r.rows[0]});
  } catch(e) { next(e); }
});
export default router;
