const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { readDb, writeDb } = require('../db');
const { normalizeAttacks } = require('../attacks');
const { requireAdmin } = require('../auth');
const { balanceStats } = require('../statBudget');

function buildRouter(uploadsDir) {
  const router = express.Router();
  const adminOnly = requireAdmin(readDb);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `creature-${req.params.id}-${Date.now()}${ext}`);
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

  function nextId(db) {
    return db.creatures.reduce((max, c) => Math.max(max, c.id), 0) + 1;
  }

  function nextNumber(db) {
    return db.creatures.reduce((max, c) => Math.max(max, c.number), 0) + 1;
  }

  function toArray(value) {
    return Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];
  }

  function clampFleeChance(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(0.9, n);
  }

  function parseEvolvesToId(value) {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function validateEvolvesTo(db, creatureId, evolvesToId) {
    if (evolvesToId == null) return null;
    if (evolvesToId === creatureId) return 'Uma criatura não pode evoluir para si mesma';
    const target = db.creatures.find((c) => c.id === evolvesToId);
    if (!target) return 'Criatura de destino da evolução não encontrada';
    const conflict = db.creatures.find((c) => c.evolvesToId === evolvesToId && c.id !== creatureId);
    if (conflict) return `${conflict.name} já evolui para ${target.name}`;
    return null;
  }

  function summarize(c) {
    return { id: c.id, number: c.number, name: c.name, types: c.types, imageUrl: c.imageUrl };
  }

  function withNormalizedAttacks(c) {
    return { ...c, attacks: normalizeAttacks(c.attacks) };
  }

  function buildEvolutionChain(db, creature) {
    const byId = new Map(db.creatures.map((c) => [c.id, c]));

    let start = creature;
    const seenBack = new Set([start.id]);
    for (;;) {
      const prev = db.creatures.find((c) => c.evolvesToId === start.id);
      if (!prev || seenBack.has(prev.id)) break;
      start = prev;
      seenBack.add(prev.id);
    }

    const chain = [start];
    const seenForward = new Set([start.id]);
    let current = start;
    for (;;) {
      if (!current.evolvesToId) break;
      const next = byId.get(current.evolvesToId);
      if (!next || seenForward.has(next.id)) break;
      chain.push(next);
      seenForward.add(next.id);
      current = next;
    }

    return chain.length > 1 ? chain.map(summarize) : [];
  }

  router.get('/', (req, res) => {
    const db = readDb();
    const { search, sort } = req.query;
    let list = db.creatures;

    if (search) {
      const q = String(search).trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          String(c.number).padStart(4, '0').includes(q) ||
          String(c.number) === q
      );
    }

    list = [...list].sort((a, b) => {
      if (sort === 'name-asc') return a.name.localeCompare(b.name);
      if (sort === 'name-desc') return b.name.localeCompare(a.name);
      if (sort === 'number-desc') return b.number - a.number;
      return a.number - b.number;
    });

    res.json(list.map(withNormalizedAttacks));
  });

  router.get('/random', (req, res) => {
    const db = readDb();
    if (db.creatures.length === 0) {
      return res.status(404).json({ error: 'Nenhuma criatura cadastrada ainda' });
    }
    const creature = db.creatures[Math.floor(Math.random() * db.creatures.length)];
    res.json(withNormalizedAttacks(creature));
  });

  router.get('/:idOrNumber', (req, res) => {
    const db = readDb();
    const key = req.params.idOrNumber;
    const creature = db.creatures.find((c) => String(c.id) === key || String(c.number) === key);
    if (!creature) return res.status(404).json({ error: 'Criatura não encontrada' });
    res.json({ ...withNormalizedAttacks(creature), evolutionChain: buildEvolutionChain(db, creature) });
  });

  router.post('/', adminOnly, (req, res) => {
    const db = readDb();
    const body = req.body || {};

    if (!body.name || !String(body.name).trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const number = body.number !== undefined && body.number !== '' ? Number(body.number) : nextNumber(db);
    if (db.creatures.some((c) => c.number === number)) {
      return res.status(400).json({ error: `Já existe uma criatura com o número ${number}` });
    }

    const id = nextId(db);
    const evolvesToId = parseEvolvesToId(body.evolvesToId);
    const evoError = validateEvolvesTo(db, id, evolvesToId);
    if (evoError) return res.status(400).json({ error: evoError });

    const creature = {
      id,
      number,
      name: String(body.name).trim(),
      types: toArray(body.types),
      category: body.category || '',
      description: body.description || '',
      height: body.height !== undefined && body.height !== '' ? Number(body.height) : null,
      weight: body.weight !== undefined && body.weight !== '' ? Number(body.weight) : null,
      genderless: !!body.genderless,
      abilities: toArray(body.abilities),
      weaknesses: toArray(body.weaknesses),
      attacks: normalizeAttacks(body.attacks),
      stats: balanceStats(body.stats),
      wildFleeChance: clampFleeChance(body.wildFleeChance, 0),
      imageUrl: null,
      evolvesToId,
    };

    db.creatures.push(creature);
    writeDb(db);
    res.status(201).json(creature);
  });

  router.put('/:id', adminOnly, (req, res) => {
    const db = readDb();
    const idx = db.creatures.findIndex((c) => String(c.id) === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Criatura não encontrada' });

    const body = req.body || {};
    const existing = db.creatures[idx];
    const number = body.number !== undefined && body.number !== '' ? Number(body.number) : existing.number;

    if (db.creatures.some((c) => c.number === number && String(c.id) !== req.params.id)) {
      return res.status(400).json({ error: `Já existe uma criatura com o número ${number}` });
    }

    let evolvesToId = existing.evolvesToId ?? null;
    if (body.evolvesToId !== undefined) {
      evolvesToId = parseEvolvesToId(body.evolvesToId);
      const evoError = validateEvolvesTo(db, existing.id, evolvesToId);
      if (evoError) return res.status(400).json({ error: evoError });
    }

    const updated = {
      ...existing,
      name: body.name ? String(body.name).trim() : existing.name,
      number,
      types: body.types !== undefined ? toArray(body.types) : existing.types,
      category: body.category !== undefined ? body.category : existing.category,
      description: body.description !== undefined ? body.description : existing.description,
      height: body.height !== undefined && body.height !== '' ? Number(body.height) : existing.height,
      weight: body.weight !== undefined && body.weight !== '' ? Number(body.weight) : existing.weight,
      genderless: body.genderless !== undefined ? !!body.genderless : existing.genderless,
      abilities: body.abilities !== undefined ? toArray(body.abilities) : existing.abilities,
      weaknesses: body.weaknesses !== undefined ? toArray(body.weaknesses) : existing.weaknesses,
      attacks: body.attacks !== undefined ? normalizeAttacks(body.attacks) : normalizeAttacks(existing.attacks),
      stats: body.stats
        ? balanceStats({
            hp: Number(body.stats.hp) || existing.stats.hp,
            attack: Number(body.stats.attack) || existing.stats.attack,
            defense: Number(body.stats.defense) || existing.stats.defense,
            spAttack: Number(body.stats.spAttack) || existing.stats.spAttack,
            spDefense: Number(body.stats.spDefense) || existing.stats.spDefense,
            speed: Number(body.stats.speed) || existing.stats.speed,
          })
        : existing.stats,
      wildFleeChance:
        body.wildFleeChance !== undefined
          ? clampFleeChance(body.wildFleeChance, 0)
          : existing.wildFleeChance ?? 0,
      evolvesToId,
    };

    db.creatures[idx] = updated;
    writeDb(db);
    res.json(updated);
  });

  router.delete('/:id', adminOnly, (req, res) => {
    const db = readDb();
    const idx = db.creatures.findIndex((c) => String(c.id) === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Criatura não encontrada' });

    const [removed] = db.creatures.splice(idx, 1);
    db.creatures.forEach((c) => {
      if (c.evolvesToId === removed.id) c.evolvesToId = null;
    });
    writeDb(db);

    if (removed.imageUrl) {
      const imgPath = path.join(uploadsDir, path.basename(removed.imageUrl));
      fs.unlink(imgPath, () => {});
    }

    res.status(204).end();
  });

  router.post('/:id/image', adminOnly, (req, res) => {
    const db = readDb();
    const idx = db.creatures.findIndex((c) => String(c.id) === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Criatura não encontrada' });

    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Imagem muito grande. O limite é 10 MB.' });
        }
        return res.status(400).json({ error: err.message });
      }
      if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

      const dbNow = readDb();
      const nowIdx = dbNow.creatures.findIndex((c) => String(c.id) === req.params.id);
      const prevImage = dbNow.creatures[nowIdx].imageUrl;

      dbNow.creatures[nowIdx].imageUrl = `/uploads/${req.file.filename}`;
      writeDb(dbNow);

      if (prevImage) {
        const prevPath = path.join(uploadsDir, path.basename(prevImage));
        fs.unlink(prevPath, () => {});
      }

      res.json(dbNow.creatures[nowIdx]);
    });
  });

  return router;
}

module.exports = buildRouter;
