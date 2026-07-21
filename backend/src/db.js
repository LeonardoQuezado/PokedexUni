const fs = require('fs');
const path = require('path');
const { normalizeAttacks } = require('./attacks');

const SEED_FILE = path.join(__dirname, '..', 'seed', 'seed.json');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seed = fs.readFileSync(SEED_FILE, 'utf-8');
    fs.writeFileSync(DB_FILE, seed);
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.creatures)) data.creatures = [];
  if (!Array.isArray(data.users)) data.users = [];
  if (!Array.isArray(data.ownedCreatures)) data.ownedCreatures = [];
  data.users.forEach((u) => {
    if (typeof u.dayonballs !== 'number') u.dayonballs = 10;
  });
  return data;
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function enrichOwnedCreatures(db, userId) {
  return db.ownedCreatures
    .filter((oc) => oc.userId === userId)
    .map((oc) => {
      const species = db.creatures.find((c) => c.id === oc.speciesId);
      return {
        id: oc.id,
        speciesId: oc.speciesId,
        name: species?.name || 'Desconhecido',
        number: species?.number ?? null,
        types: species?.types || [],
        weaknesses: species?.weaknesses || [],
        imageUrl: species?.imageUrl || null,
        stats: species?.stats || { hp: 50, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 50 },
        attacks: normalizeAttacks(species?.attacks),
      };
    });
}

module.exports = { readDb, writeDb, enrichOwnedCreatures, DB_FILE, DATA_DIR };
