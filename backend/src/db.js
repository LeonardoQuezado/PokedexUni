const fs = require('fs');
const path = require('path');

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
        imageUrl: species?.imageUrl || null,
      };
    });
}

module.exports = { readDb, writeDb, enrichOwnedCreatures, DB_FILE, DATA_DIR };
