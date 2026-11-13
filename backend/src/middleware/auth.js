import jwt from 'jsonwebtoken';
export function requireAuth(req,res,next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    if (!token) throw new Error('missing');
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error:'Authentication required.' }); }
}
export function requireRole(...roles) {
  return (req,res,next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ error:'Insufficient permissions.' });
}
