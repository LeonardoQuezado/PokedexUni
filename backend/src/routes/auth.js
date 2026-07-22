const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { readDb, writeDb, enrichOwnedCreatures } = require('../db');
const { signToken, setAuthCookie, clearAuthCookie, publicUser, requireAuth, COOKIE_NAME } = require('../auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const STARTING_GOLD = 100;

function buildRouter() {
  const router = express.Router();
  const auth = requireAuth(readDb);

  function nextId(list) {
    return list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }

  function findByIdentifier(db, identifier) {
    const q = String(identifier || '').trim().toLowerCase();
    return db.users.find((u) => u.username.toLowerCase() === q || u.email.toLowerCase() === q);
  }

  router.post('/register', (req, res) => {
    const { username, email, password } = req.body || {};

    if (!username || !USERNAME_RE.test(String(username).trim())) {
      return res.status(400).json({ error: 'Usuário deve ter 3-20 caracteres (letras, números, _)' });
    }
    if (!email || !EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ error: 'E-mail inválido' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    const db = readDb();
    const usernameTrim = String(username).trim();
    const emailTrim = String(email).trim().toLowerCase();

    if (db.users.some((u) => u.username.toLowerCase() === usernameTrim.toLowerCase())) {
      return res.status(400).json({ error: 'Esse nome de usuário já está em uso' });
    }
    if (db.users.some((u) => u.email.toLowerCase() === emailTrim)) {
      return res.status(400).json({ error: 'Esse e-mail já está cadastrado' });
    }

    const user = {
      id: nextId(db.users),
      username: usernameTrim,
      email: emailTrim,
      passwordHash: bcrypt.hashSync(String(password), 10),
      verified: false,
      verificationToken: crypto.randomBytes(24).toString('hex'),
      photoUrl: null,
      dayonballs: 10,
      gold: STARTING_GOLD,
      arenaWins: 0,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);

    db.creatures.forEach((species) => {
      db.ownedCreatures.push({
        id: nextId(db.ownedCreatures),
        userId: user.id,
        speciesId: species.id,
        level: 1,
        xp: 0,
        createdAt: new Date().toISOString(),
      });
    });

    writeDb(db);

    res.status(201).json({
      user: publicUser(user),
      verificationLink: `/verificar?token=${user.verificationToken}`,
    });
  });

  router.post('/verify', (req, res) => {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Token é obrigatório' });

    const db = readDb();
    const user = db.users.find((u) => u.verificationToken === token);
    if (!user) return res.status(400).json({ error: 'Token inválido ou já utilizado' });

    user.verified = true;
    user.verificationToken = null;
    writeDb(db);

    res.json({ user: publicUser(user) });
  });

  router.post('/resend-verification', (req, res) => {
    const { identifier } = req.body || {};
    const db = readDb();
    const user = findByIdentifier(db, identifier);

    if (!user) return res.status(404).json({ error: 'Conta não encontrada' });
    if (user.verified) return res.status(400).json({ error: 'Essa conta já está verificada' });

    if (!user.verificationToken) {
      user.verificationToken = crypto.randomBytes(24).toString('hex');
      writeDb(db);
    }

    res.json({ verificationLink: `/verificar?token=${user.verificationToken}` });
  });

  router.post('/login', (req, res) => {
    const { identifier, password } = req.body || {};
    const db = readDb();
    const user = findByIdentifier(db, identifier);

    if (!user || !bcrypt.compareSync(String(password || ''), user.passwordHash)) {
      return res.status(401).json({ error: 'Usuário/e-mail ou senha inválidos' });
    }
    if (!user.verified) {
      return res.status(403).json({ error: 'Confirme seu e-mail antes de entrar', needsVerification: true });
    }

    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ user: publicUser(user) });
  });

  router.post('/logout', (req, res) => {
    clearAuthCookie(res);
    res.status(204).end();
  });

  router.get('/me', auth, (req, res) => {
    const db = readDb();
    res.json({
      user: publicUser(req.user),
      ownedCreatures: enrichOwnedCreatures(db, req.user.id),
    });
  });

  return router;
}

module.exports = buildRouter;
module.exports.COOKIE_NAME = COOKIE_NAME;
