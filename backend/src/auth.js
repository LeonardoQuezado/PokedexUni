const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'unidex-dev-secret-change-me';
const COOKIE_NAME = 'unidex_token';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: COOKIE_SECURE });
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    verified: user.verified,
    photoUrl: user.photoUrl || null,
  };
}

function requireAuth(readDb) {
  return (req, res, next) => {
    const token = req.cookies?.[COOKIE_NAME];
    const payload = token ? verifyToken(token) : null;
    if (!payload) return res.status(401).json({ error: 'Não autenticado' });

    const db = readDb();
    const user = db.users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: 'Não autenticado' });

    req.user = user;
    next();
  };
}

module.exports = {
  COOKIE_NAME,
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  publicUser,
  requireAuth,
};
