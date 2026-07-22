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

const EFFECT_KINDS = ['lowerDefense', 'coinFlip', 'applyStatus', 'requiresStatus'];
const DEFAULT_STATUS = 'lubrificado';

function clampPct(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(0.9, Math.max(0.01, n));
}

function normalizeEffect(raw) {
  if (!raw || typeof raw !== 'object' || !EFFECT_KINDS.includes(raw.kind)) return null;

  if (raw.kind === 'lowerDefense') {
    return { kind: 'lowerDefense', amount: clampPct(raw.amount, 0.25) };
  }
  if (raw.kind === 'coinFlip') {
    return { kind: 'coinFlip', selfDamagePercent: clampPct(raw.selfDamagePercent, 0.1) };
  }
  if (raw.kind === 'applyStatus') {
    return {
      kind: 'applyStatus',
      status: String(raw.status || DEFAULT_STATUS).slice(0, 30),
      selfSpeedBoost: clampPct(raw.selfSpeedBoost, 0.2),
    };
  }
  if (raw.kind === 'requiresStatus') {
    return {
      kind: 'requiresStatus',
      status: String(raw.status || DEFAULT_STATUS).slice(0, 30),
      selfSpeedPenalty: clampPct(raw.selfSpeedPenalty, 0.5),
    };
  }
  return null;
}

function normalizeAttack(raw, index) {
  if (typeof raw === 'string') {
    const name = raw.trim();
    if (!name) return null;
    return { id: index + 1, name, type: null, category: 'fisico', power: 50, accuracy: 100 };
  }
  if (!raw || !raw.name || !String(raw.name).trim()) return null;

  const power = Number(raw.power);
  const accuracy = Number(raw.accuracy);
  const effect = normalizeEffect(raw.effect);
  return {
    id: raw.id != null ? Number(raw.id) : index + 1,
    name: String(raw.name).trim(),
    type: raw.type ? String(raw.type).trim() : null,
    category: raw.category === 'especial' ? 'especial' : 'fisico',
    power: Number.isFinite(power) && power > 0 ? Math.min(150, Math.round(power)) : 50,
    accuracy: Number.isFinite(accuracy) ? Math.min(100, Math.max(1, Math.round(accuracy))) : 100,
    ...(effect ? { effect } : {}),
  };
}

function normalizeAttacks(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((raw, i) => normalizeAttack(raw, i))
    .filter(Boolean)
    .slice(0, MAX_ATTACKS);
}

function calculateDamage(attackerStats, defenderStats, defenderWeaknesses, move, forceCrit = false) {
  const atkStat = move.category === 'especial' ? attackerStats.spAttack : attackerStats.attack;
  const defStat = move.category === 'especial' ? defenderStats.spDefense : defenderStats.defense;
  const base = (move.power * atkStat) / Math.max(1, defStat) / 2;
  const effective = !!(move.type && (defenderWeaknesses || []).includes(move.type));
  const variance = 0.85 + Math.random() * 0.15;
  const critMultiplier = forceCrit ? 2 : 1;
  const damage = Math.max(1, Math.round(base * (effective ? 1.5 : 1) * critMultiplier * variance));
  return { damage, effective, crit: forceCrit };
}

module.exports = {
  MAX_ATTACKS,
  USES_PER_MOVE,
  STRUGGLE,
  DEFAULT_STATUS,
  normalizeAttack,
  normalizeAttacks,
  calculateDamage,
};
