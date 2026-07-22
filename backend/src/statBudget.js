const STAT_KEYS = ['hp', 'attack', 'defense', 'spAttack', 'spDefense', 'speed'];
const STAT_BUDGET = 405;
const MIN_STAT = 1;
const DEFAULT_STAT = 50;

function balanceStats(rawStats) {
  const raw = STAT_KEYS.map((key) => {
    const n = Number(rawStats?.[key]);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_STAT;
  });

  const total = raw.reduce((sum, n) => sum + n, 0);
  const scale = STAT_BUDGET / total;

  const scaled = raw.map((n) => Math.max(MIN_STAT, Math.round(n * scale)));
  const drift = STAT_BUDGET - scaled.reduce((sum, n) => sum + n, 0);

  if (drift !== 0) {
    let adjustIdx = 0;
    for (let i = 1; i < scaled.length; i++) {
      if (scaled[i] > scaled[adjustIdx]) adjustIdx = i;
    }
    scaled[adjustIdx] = Math.max(MIN_STAT, scaled[adjustIdx] + drift);
  }

  const result = {};
  STAT_KEYS.forEach((key, i) => {
    result[key] = scaled[i];
  });
  return result;
}

module.exports = { STAT_KEYS, STAT_BUDGET, balanceStats };
