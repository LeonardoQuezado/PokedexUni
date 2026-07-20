const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { readDb, writeDb } = require('../db');
const { publicUser, requireAuth } = require('../auth');

function buildRouter(uploadsDir) {
  const router = express.Router();
  const auth = requireAuth(readDb);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `user-${req.user.id}-${Date.now()}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) cb(null, true);
      else cb(new Error('Formato de imagem inválido. Use PNG, JPG, WEBP ou GIF.'));
    },
  });

  router.post('/me/photo', auth, (req, res) => {
    upload.single('photo')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Imagem muito grande. O limite é 10 MB.' });
        }
        return res.status(400).json({ error: err.message });
      }
      if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

      const db = readDb();
      const user = db.users.find((u) => u.id === req.user.id);
      const prevPhoto = user.photoUrl;

      user.photoUrl = `/uploads/${req.file.filename}`;
      writeDb(db);

      if (prevPhoto) {
        fs.unlink(path.join(uploadsDir, path.basename(prevPhoto)), () => {});
      }

      res.json({ user: publicUser(user) });
    });
  });

  return router;
}

module.exports = buildRouter;
