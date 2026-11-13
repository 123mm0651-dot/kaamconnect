import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
const router = Router();
router.post('/', requireAuth, requireRole('customer'), async (req,res,next) => {
  try {
    const { serviceId, serviceName, customerName, customerPhone, serviceArea, preferredTime, notes } = req.body;
    if (!serviceName || !customerName || !customerPhone || !serviceArea || !preferredTime)
      return res.status(400).json({error:'Please provide service, contact and schedule details.'});
    const r=await pool.query(`insert into bookings(customer_id,service_id,service_name,customer_name,customer_phone,service_area,preferred_time,notes)
      values($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
      [req.user.id,serviceId || null,serviceName,customerName,customerPhone,serviceArea,preferredTime,notes || null]);
    res.status(201).json({booking:r.rows[0]});
  } catch(e) { next(e); }
});
router.get('/mine', requireAuth, async (req,res,next) => {
  try {
    const q=req.user.role==='admin'
      ? await pool.query('select * from bookings order by created_at desc')
      : req.user.role==='provider'
        ? await pool.query('select b.* from bookings b join providers p on p.id=b.provider_id where p.user_id=$1 order by b.created_at desc',[req.user.id])
        : await pool.query('select * from bookings where customer_id=$1 order by created_at desc',[req.user.id]);
    res.json({bookings:q.rows});
  } catch(e) { next(e); }
});
router.patch('/:id/status', requireAuth, async (req,res,next) => {
  try {
    const {status}=req.body;
    const allowed=['accepted','in_progress','completed','cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({error:'Invalid status.'});
    const client=await pool.connect();
    try {
      await client.query('begin');
      const found=await client.query('select b.*,p.user_id as provider_user_id from bookings b left join providers p on p.id=b.provider_id where b.id=$1 for update',[req.params.id]);
      if (!found.rowCount) { await client.query('rollback'); return res.status(404).json({error:'Booking not found.'}); }
      const b=found.rows[0];
      const permitted=req.user.role==='admin' ||
        (req.user.role==='customer' && b.customer_id===req.user.id && status==='cancelled' && b.status==='requested') ||
        (req.user.role==='provider' && b.provider_user_id===req.user.id && ['accepted','in_progress','completed','cancelled'].includes(status));
      if (!permitted) { await client.query('rollback'); return res.status(403).json({error:'You cannot change this booking.'}); }
      const updated=await client.query('update bookings set status=$1,updated_at=now() where id=$2 returning *',[status,req.params.id]);
      await client.query('commit'); res.json({booking:updated.rows[0]});
    } catch(e) { await client.query('rollback'); throw e; } finally { client.release(); }
  } catch(e) { next(e); }
});
router.patch('/:id/assign', requireAuth, requireRole('admin'), async (req,res,next) => {
  try {
    const r=await pool.query('update bookings set provider_id=$1,status=$2,updated_at=now() where id=$3 returning *',[req.body.providerId,'accepted',req.params.id]);
    if (!r.rowCount) return res.status(404).json({error:'Booking not found.'});
    res.json({booking:r.rows[0]});
  } catch(e) { next(e); }
});
export default router;
