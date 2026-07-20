const MAX_ATTACKS = 4;
const USES_PER_MOVE = 3;

const STRUGGLE = {
  id: 'struggle',
  name: 'Investida Desesperada',
  type: null,
  category: 'fisico',
  power: 30,
  accuracy: 100,
};

function normalizeAttack(raw, index) {
  if (typeof raw === 'string') {
    const name = raw.trim();
    if (!name) return null;
    return { id: index + 1, name, type: null, category: 'fisico', power: 50, accuracy: 100 };
  }
  if (!raw || !raw.name || !String(raw.name).trim()) return null;

  const power = Number(raw.power);
  const accuracy = Number(raw.accuracy);
  return {
    id: raw.id != null ? Number(raw.id) : index + 1,
    name: String(raw.name).trim(),
    type: raw.type ? String(raw.type).trim() : null,
    category: raw.category === 'especial' ? 'especial' : 'fisico',
    power: Number.isFinite(power) && power > 0 ? Math.min(150, Math.round(power)) : 50,
    accuracy: Number.isFinite(accuracy) ? Math.min(100, Math.max(1, Math.round(accuracy))) : 100,
  };
}

function normalizeAttacks(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((raw, i) => normalizeAttack(raw, i))
    .filter(Boolean)
    .slice(0, MAX_ATTACKS);
}

function calculateDamage(attackerStats, defenderStats, defenderWeaknesses, move) {
  const atkStat = move.category === 'especial' ? attackerStats.spAttack : attackerStats.attack;
  const defStat = move.category === 'especial' ? defenderStats.spDefense : defenderStats.defense;
  const base = (move.power * atkStat) / Math.max(1, defStat) / 2;
  const effective = !!(move.type && (defenderWeaknesses || []).includes(move.type));
  const variance = 0.85 + Math.random() * 0.15;
  const damage = Math.max(1, Math.round(base * (effective ? 1.5 : 1) * variance));
  return { damage, effective };
}

module.exports = { MAX_ATTACKS, USES_PER_MOVE, STRUGGLE, normalizeAttack, normalizeAttacks, calculateDamage };
