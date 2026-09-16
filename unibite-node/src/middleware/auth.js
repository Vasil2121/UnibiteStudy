export function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Απαιτείται σύνδεση' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Απαγορεύεται η πρόσβαση' });
  }
  next();
}
