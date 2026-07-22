const XP_BASE = 30;
const XP_GROWTH = 1.4;
const STAT_GROWTH_PER_LEVEL = 0.08;

function xpForLevel(level) {
  return Math.round(XP_BASE * XP_GROWTH ** (level - 1));
}

function scaleStats(baseStats, level) {
  const multiplier = 1 + (level - 1) * STAT_GROWTH_PER_LEVEL;
  return {
    hp: Math.round(baseStats.hp * multiplier),
    attack: Math.round(baseStats.attack * multiplier),
    defense: Math.round(baseStats.defense * multiplier),
    spAttack: Math.round(baseStats.spAttack * multiplier),
    spDefense: Math.round(baseStats.spDefense * multiplier),
    speed: Math.round(baseStats.speed * multiplier),
  };
}

function xpReward(wildLevel, playerLevel) {
  const base = 10 + wildLevel * 5;
  const gap = Math.max(0, playerLevel - wildLevel);
  const multiplier = Math.max(0.2, 1 - gap * 0.15);
  return Math.max(1, Math.round(base * multiplier));
}

function applyXp(current, xpGained) {
  let { level, xp } = current;
  xp += xpGained;
  let leveledUp = false;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    leveledUp = true;
  }
  return { level, xp, leveledUp };
}

function randomWildLevel(playerLevel) {
  const variance = Math.floor(Math.random() * 5) - 2; // -2..+2
  return Math.max(1, playerLevel + variance);
}

module.exports = { xpForLevel, scaleStats, xpReward, applyXp, randomWildLevel };
