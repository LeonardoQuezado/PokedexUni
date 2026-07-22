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

const INCONSEQUENT_ATTACK = {
  id: 'inconsequente',
  name: 'Ataque Inconsequente',
  type: null,
  category: 'fisico',
  power: 55,
  accuracy: 100,
};

const PANCADA = {
  id: 'pancada',
  name: 'Pancada',
  type: null,
  category: 'fisico',
  power: 45,
  accuracy: 100,
};

const EFFECT_KINDS = [
  'lowerDefense',
  'coinFlip',
  'applyStatus',
  'requiresStatus',
  'critChance',
  'stackingBuff',
  'resetStacksHeal',
  'tauntStatus',
  'selfHeal',
  'lowerAccuracy',
  'selfBuffGate',
  'invulnerable',
  'chanceConfuse',
  'escalatingPerUse',
  'selfEvasionBuff',
  'selfStatusPenalty',
];
const DEFAULT_STATUS = 'lubrificado';

function clampPct(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(0.9, Math.max(0.01, n));
}

function clampPower(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(150, Math.round(n)) : fallback;
}

function normalizeEffect(raw) {
  if (!raw || typeof raw !== 'object' || !EFFECT_KINDS.includes(raw.kind)) return null;

  let effect;
  if (raw.kind === 'lowerDefense') {
    effect = { kind: 'lowerDefense', amount: clampPct(raw.amount, 0.25) };
  } else if (raw.kind === 'coinFlip') {
    effect = { kind: 'coinFlip', selfDamagePercent: clampPct(raw.selfDamagePercent, 0.1) };
  } else if (raw.kind === 'applyStatus') {
    effect = {
      kind: 'applyStatus',
      status: String(raw.status || DEFAULT_STATUS).slice(0, 30),
      selfSpeedBoost: clampPct(raw.selfSpeedBoost, 0.2),
    };
  } else if (raw.kind === 'requiresStatus') {
    effect = {
      kind: 'requiresStatus',
      status: String(raw.status || DEFAULT_STATUS).slice(0, 30),
      selfSpeedPenalty: clampPct(raw.selfSpeedPenalty, 0.5),
    };
  } else if (raw.kind === 'critChance') {
    effect = { kind: 'critChance', chance: clampPct(raw.chance, 0.35) };
  } else if (raw.kind === 'stackingBuff') {
    effect = { kind: 'stackingBuff', stat: 'attack', statBoostPerStack: clampPct(raw.statBoostPerStack, 0.15) };
  } else if (raw.kind === 'resetStacksHeal') {
    effect = { kind: 'resetStacksHeal', stat: 'attack' };
  } else if (raw.kind === 'tauntStatus') {
    effect = { kind: 'tauntStatus', status: 'provocado' };
  } else if (raw.kind === 'selfHeal') {
    effect = { kind: 'selfHeal', healPercent: clampPct(raw.healPercent, 0.35) };
  } else if (raw.kind === 'lowerAccuracy') {
    effect = { kind: 'lowerAccuracy', amount: clampPct(raw.amount, 0.3) };
  } else if (raw.kind === 'selfBuffGate') {
    effect = {
      kind: 'selfBuffGate',
      status: String(raw.status || 'estudando').slice(0, 30),
      speedBoost: clampPct(raw.speedBoost, 0.2),
      defenseBoost: clampPct(raw.defenseBoost, 0.2),
    };
  } else if (raw.kind === 'invulnerable') {
    effect = { kind: 'invulnerable' };
  } else if (raw.kind === 'chanceConfuse') {
    effect = {
      kind: 'chanceConfuse',
      chance: clampPct(raw.chance, 0.3),
      status: String(raw.status || 'confuso').slice(0, 30),
    };
  } else if (raw.kind === 'escalatingPerUse') {
    const tiers = Array.isArray(raw.powers) ? raw.powers : [];
    effect = {
      kind: 'escalatingPerUse',
      powers: [
        clampPower(tiers[0], 25),
        clampPower(tiers[1], 60),
        clampPower(tiers[2], 140),
      ],
    };
  } else if (raw.kind === 'selfEvasionBuff') {
    effect = {
      kind: 'selfEvasionBuff',
      status: String(raw.status || 'sniff').slice(0, 30),
      evasionBoost: clampPct(raw.evasionBoost, 0.2),
      speedBoost: clampPct(raw.speedBoost, 0.2),
    };
  } else if (raw.kind === 'selfStatusPenalty') {
    effect = {
      kind: 'selfStatusPenalty',
      status: String(raw.status || 'sniff').slice(0, 30),
      penaltyPercent: clampPct(raw.penaltyPercent, 0.5),
    };
  } else {
    return null;
  }

  if (raw.requiresSelfStatus) {
    effect.requiresSelfStatus = String(raw.requiresSelfStatus).slice(0, 30);
  }

  return effect;
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
  INCONSEQUENT_ATTACK,
  PANCADA,
  DEFAULT_STATUS,
  normalizeAttack,
  normalizeAttacks,
  calculateDamage,
};
