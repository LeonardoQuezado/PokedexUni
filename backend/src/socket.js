const { Server } = require('socket.io');
const { verifyToken, COOKIE_NAME } = require('./auth');
const { readDb, writeDb, enrichOwnedCreatures } = require('./db');
const {
  STRUGGLE,
  INCONSEQUENT_ATTACK,
  PANCADA,
  USES_PER_MOVE,
  normalizeAttacks,
  calculateDamage,
} = require('./attacks');
const { scaleStats, xpReward, applyXp, randomWildLevel } = require('./leveling');

const WILD_USER_ID = -1;
const WILD_SPECIES_NUMBERS = [1, 5, 6, 7, 10]; // catchable species pool for wild encounters
const CONFUSION_SELF_HIT_CHANCE = 0.33;
const CONFUSION_SELF_DAMAGE_PERCENT = 0.15;

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

function attachSocket(server) {
  const io = new Server(server, {
    cors: { origin: true, credentials: true },
  });

  const arenaPresence = new Map(); // userId -> Set<socketId>
  const pendingChallenges = new Map(); // challengeId -> { fromUserId, toUserId }
  const battles = new Map(); // roomId -> battle state
  let nextChallengeId = 1;

  io.use((socket, next) => {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const payload = cookies[COOKIE_NAME] ? verifyToken(cookies[COOKIE_NAME]) : null;
    if (!payload) return next(new Error('unauthorized'));

    const db = readDb();
    const user = db.users.find((u) => u.id === payload.sub);
    if (!user) return next(new Error('unauthorized'));

    socket.userId = user.id;
    next();
  });

  function broadcastArena() {
    const db = readDb();
    const online = [...arenaPresence.keys()]
      .map((userId) => db.users.find((u) => u.id === userId))
      .filter(Boolean)
      .map((user) => ({ id: user.id, username: user.username, photoUrl: user.photoUrl || null }));
    io.to('arena').emit('arena:online', online);
  }

  function leaveArena(socket) {
    socket.leave('arena');
    const set = arenaPresence.get(socket.userId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) arenaPresence.delete(socket.userId);
    }
    broadcastArena();
  }

  function buildBattlePlayer(db, userId) {
    const user = db.users.find((u) => u.id === userId);
    const creature = enrichOwnedCreatures(db, userId)[0] || null;
    return {
      userId: user.id,
      username: user.username,
      photoUrl: user.photoUrl || null,
      creature,
      hp: creature ? creature.stats.hp : 0,
      maxHp: creature ? creature.stats.hp : 0,
      usesLeft: {
        ...(creature ? Object.fromEntries(creature.attacks.map((a) => [a.id, USES_PER_MOVE])) : {}),
        pancada: USES_PER_MOVE,
      },
      statMods: { attack: 1, defense: 1, speed: 1, accuracy: 1, evasion: 0 },
      statusEffects: {},
      fleeBonus: 0,
    };
  }

  function buildWildPlayer(species, level) {
    const attacks = normalizeAttacks(species.attacks);
    const scaledStats = scaleStats(species.stats, level);
    const creature = {
      name: species.name,
      imageUrl: species.imageUrl || null,
      stats: scaledStats,
      weaknesses: species.weaknesses || [],
      attacks,
    };
    return {
      userId: WILD_USER_ID,
      username: `${species.name} selvagem`,
      photoUrl: species.imageUrl || null,
      isWild: true,
      speciesId: species.id,
      level,
      creature,
      hp: scaledStats.hp,
      maxHp: scaledStats.hp,
      usesLeft: { ...Object.fromEntries(attacks.map((a) => [a.id, USES_PER_MOVE])), pancada: USES_PER_MOVE },
      statMods: { attack: 1, defense: 1, speed: 1, accuracy: 1, evasion: 0 },
      statusEffects: {},
      fleeBonus: 0,
      wildFleeChance: species.wildFleeChance || 0,
    };
  }

  function pickWildSpecies(db) {
    const candidates = db.creatures.filter((c) => WILD_SPECIES_NUMBERS.includes(c.number));
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function createBattle(roomId, playerA, playerB, extra) {
    const state = {
      roomId,
      status: 'active',
      winnerId: null,
      log: [],
      players: [playerA, playerB],
      pendingMoves: {},
      ...extra,
    };
    battles.set(roomId, state);
    return state;
  }

  function createWildBattle(db, humanUserId) {
    const species = pickWildSpecies(db);
    if (!species) return null;

    const human = buildBattlePlayer(db, humanUserId);
    if (!human.creature) return null;

    const wildLevel = randomWildLevel(human.creature.level);
    const wild = buildWildPlayer(species, wildLevel);
    const roomId = `wild-${humanUserId}-${Date.now()}`;
    return createBattle(roomId, human, wild, {
      isWild: true,
      captured: false,
      fled: false,
      wildFled: false,
      xpGained: null,
      leveledUp: false,
      newLevel: null,
      log: [`Um ${species.name} selvagem (nível ${wildLevel}) apareceu!`],
    });
  }

  function wildTriesToFlee(wild) {
    const chance = (wild.wildFleeChance || 0) + (wild.fleeBonus || 0);
    return chance > 0 && Math.random() < chance;
  }

  function findMove(player, attackId) {
    if (attackId === 'struggle') return STRUGGLE;
    if (attackId === 'pancada') return PANCADA;
    return (player.creature?.attacks || []).find((a) => a.id === attackId) || null;
  }

  function creatureLabel(player) {
    return player.isWild ? player.creature.name : `${player.creature.name} de ${player.username}`;
  }

  function effectiveStats(player) {
    const base = player.creature.stats;
    const mods = player.statMods || { attack: 1, defense: 1, speed: 1 };
    return {
      ...base,
      attack: base.attack * (mods.attack ?? 1),
      defense: base.defense * (mods.defense ?? 1),
      speed: base.speed * (mods.speed ?? 1),
    };
  }

  function moveIsUsable(player, attack, opponent) {
    if ((player.usesLeft[attack.id] ?? 0) <= 0) return false;
    if (attack.effect?.kind === 'requiresStatus') {
      if (!opponent?.statusEffects?.[attack.effect.status]) return false;
    }
    if (attack.effect?.requiresSelfStatus) {
      if (!player.statusEffects?.[attack.effect.requiresSelfStatus]) return false;
    }
    return true;
  }

  function allCandidateMoves(player) {
    return [...(player.creature?.attacks || []), PANCADA];
  }

  function hasUsableMove(player, opponent) {
    return allCandidateMoves(player).some((a) => moveIsUsable(player, a, opponent));
  }

  function pickAiMove(player, opponent) {
    const usable = allCandidateMoves(player).filter((a) => moveIsUsable(player, a, opponent));
    if (usable.length === 0) return 'struggle';
    return usable[Math.floor(Math.random() * usable.length)].id;
  }

  function applyAttack(attacker, move, defender, battle) {
    if (move.id !== 'struggle' && move.id !== 'inconsequente') {
      attacker.usesLeft[move.id] = Math.max(0, (attacker.usesLeft[move.id] ?? 0) - 1);
    }

    if (attacker.statusEffects?.confuso && Math.random() < CONFUSION_SELF_HIT_CHANCE) {
      const selfDamage = Math.max(1, Math.round(attacker.maxHp * CONFUSION_SELF_DAMAGE_PERCENT));
      attacker.hp = Math.max(0, attacker.hp - selfDamage);
      battle.log.push(`${attacker.username} está confuso(a) e acabou se atacando! Sofreu ${selfDamage} de dano.`);
      return;
    }

    const kind = move.effect?.kind;
    const effectiveAccuracy =
      move.accuracy * (attacker.statMods?.accuracy ?? 1) * (1 - (defender.statMods?.evasion ?? 0));
    const hits = Math.random() * 100 < effectiveAccuracy;
    if (!hits) {
      battle.log.push(`${attacker.username} usou ${move.name}, mas errou!`);
      return;
    }

    if (kind === 'selfHeal') {
      const healAmount = Math.max(1, Math.round(attacker.maxHp * move.effect.healPercent));
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
      battle.log.push(`${attacker.username} usou ${move.name} e recuperou ${healAmount} de PS!`);
      return;
    }

    if (kind === 'selfBuffGate') {
      attacker.statusEffects[move.effect.status] = true;
      attacker.statMods.speed *= 1 + move.effect.speedBoost;
      attacker.statMods.defense *= 1 + move.effect.defenseBoost;
      battle.log.push(`${attacker.username} usou ${move.name}! Velocidade e defesa aumentaram.`);
      return;
    }

    if (kind === 'selfEvasionBuff') {
      attacker.statusEffects[move.effect.status] = true;
      attacker.statMods.evasion = Math.min(0.75, (attacker.statMods.evasion ?? 0) + move.effect.evasionBoost);
      attacker.statMods.speed *= 1 + move.effect.speedBoost;
      battle.log.push(`${attacker.username} usou ${move.name}! Ficou mais evasivo(a) e ágil.`);
      return;
    }

    if (kind === 'invulnerable') {
      attacker.statusEffects.invulneravel = true;
      battle.log.push(`${attacker.username} usou ${move.name} e ficou invulnerável!`);
      return;
    }

    if (kind === 'resetStacksHeal') {
      const stat = move.effect.stat || 'attack';
      attacker.statMods[stat] = 1;
      attacker.hp = attacker.maxHp;
      battle.log.push(
        `${attacker.username} usou ${move.name}! Toda a fúria acumulada sumiu, mas a vida foi totalmente restaurada.`
      );
      return;
    }

    if (kind === 'tauntStatus') {
      defender.statusEffects[move.effect.status] = true;
      battle.log.push(
        `${creatureLabel(defender)} foi provocado(a) e só vai conseguir usar um ataque fraco no próximo turno!`
      );
      return;
    }

    if (kind === 'coinFlip') {
      if (Math.random() < 0.5) {
        const selfDamage = Math.max(1, Math.round(attacker.maxHp * move.effect.selfDamagePercent));
        attacker.hp = Math.max(0, attacker.hp - selfDamage);
        battle.log.push(
          `${attacker.username} usou ${move.name} e duvidou de si mesmo! Sofreu ${selfDamage} de dano.`
        );
      } else if (defender.statusEffects?.invulneravel) {
        defender.statusEffects.invulneravel = false;
        battle.log.push(`${creatureLabel(defender)} estava invulnerável e não sofreu dano!`);
      } else {
        const { damage, effective } = calculateDamage(
          effectiveStats(attacker),
          effectiveStats(defender),
          defender.creature.weaknesses,
          move
        );
        defender.hp = Math.max(0, defender.hp - damage);
        battle.log.push(
          `${attacker.username} usou ${move.name} com confiança total! Causou ${damage} de dano${
            effective ? ' (super efetivo!)' : ''
          }.`
        );
      }
      return;
    }

    if (defender.statusEffects?.invulneravel) {
      defender.statusEffects.invulneravel = false;
      battle.log.push(`${creatureLabel(defender)} estava invulnerável e não sofreu dano!`);
      return;
    }

    let effectiveMove = move;
    if (kind === 'escalatingPerUse') {
      const useNumber = USES_PER_MOVE - (attacker.usesLeft[move.id] ?? 0);
      const tierIndex = Math.max(0, Math.min(useNumber, move.effect.powers.length) - 1);
      effectiveMove = { ...move, power: move.effect.powers[tierIndex] };
    }

    let forceCrit = kind === 'requiresStatus';
    if (kind === 'critChance') {
      forceCrit = Math.random() < move.effect.chance;
    }

    let { damage, effective, crit } = calculateDamage(
      effectiveStats(attacker),
      effectiveStats(defender),
      defender.creature.weaknesses,
      effectiveMove,
      forceCrit
    );

    const penalized = kind === 'selfStatusPenalty' && attacker.statusEffects?.[move.effect.status];
    if (penalized) {
      damage = Math.max(1, Math.round(damage * (1 - move.effect.penaltyPercent)));
    }

    defender.hp = Math.max(0, defender.hp - damage);
    battle.log.push(
      `${attacker.username} usou ${move.name}! Causou ${damage} de dano${effective ? ' (super efetivo!)' : ''}${
        crit ? ' (CRÍTICO!)' : ''
      }${penalized ? ' (reduzido pelo sniff)' : ''}.`
    );

    if (kind === 'lowerDefense') {
      defender.statMods.defense *= 1 - move.effect.amount;
      battle.log.push(`A defesa de ${creatureLabel(defender)} caiu!`);
    }

    if (kind === 'lowerAccuracy') {
      defender.statMods.accuracy *= 1 - move.effect.amount;
      battle.log.push(`A precisão de ${creatureLabel(defender)} caiu!`);
    }

    if (kind === 'applyStatus') {
      defender.statusEffects[move.effect.status] = true;
      attacker.statMods.speed *= 1 + move.effect.selfSpeedBoost;
      battle.log.push(
        `${creatureLabel(defender)} ficou ${move.effect.status}! A velocidade de ${creatureLabel(attacker)} aumentou!`
      );
    }

    if (kind === 'requiresStatus') {
      defender.statusEffects[move.effect.status] = false;
      attacker.statMods.speed *= 1 - move.effect.selfSpeedPenalty;
      battle.log.push(`${attacker.username} ficou exausto! Sua velocidade despencou.`);
    }

    if (kind === 'stackingBuff') {
      const stat = move.effect.stat || 'attack';
      attacker.statMods[stat] *= 1 + move.effect.statBoostPerStack;
      battle.log.push(`${attacker.username} está cada vez mais furioso(a)!`);
    }

    if (kind === 'chanceConfuse' && Math.random() < move.effect.chance) {
      defender.statusEffects[move.effect.status] = true;
      battle.log.push(`${creatureLabel(defender)} ficou confuso(a)!`);
    }

    if (kind === 'critChance' && crit) {
      if (!battle.isWild) {
        attacker.hp = 0;
        battle.log.push(`${attacker.username} se assustou tanto com o próprio golpe que desmaiou na hora!`);
      } else if (attacker.isWild) {
        battle.status = 'finished';
        battle.wildFled = true;
        battle.log.push(`${attacker.username} se assustou com o próprio golpe e fugiu apavorado(a)!`);
      } else {
        battle.status = 'finished';
        battle.fled = true;
        battle.log.push(`${attacker.username} se assustou com o próprio golpe e fugiu do combate!`);
      }
    }
  }

  function awardXp(battle, humanPlayer, wildPlayer) {
    const db = readDb();
    const ownedRecord = db.ownedCreatures.find((oc) => oc.id === humanPlayer.creature.id);
    if (!ownedRecord) return;

    const gained = xpReward(wildPlayer.level, humanPlayer.creature.level);
    const result = applyXp(ownedRecord, gained);
    ownedRecord.level = result.level;
    ownedRecord.xp = result.xp;
    writeDb(db);

    battle.xpGained = gained;
    battle.leveledUp = result.leveledUp;
    battle.newLevel = result.level;
    battle.log.push(`${humanPlayer.creature.name} ganhou ${gained} de XP!`);
    if (result.leveledUp) {
      battle.log.push(`${humanPlayer.creature.name} subiu para o nível ${result.level}!`);
    }
  }

  function resolveTurn(battle) {
    const [p1, p2] = battle.players;
    let move1 = findMove(p1, battle.pendingMoves[p1.userId]);
    let move2 = findMove(p2, battle.pendingMoves[p2.userId]);
    if (!move1 || !move2) return;

    if (p1.statusEffects?.provocado) {
      move1 = INCONSEQUENT_ATTACK;
      p1.statusEffects.provocado = false;
    }
    if (p2.statusEffects?.provocado) {
      move2 = INCONSEQUENT_ATTACK;
      p2.statusEffects.provocado = false;
    }

    const order =
      (effectiveStats(p1).speed || 0) >= (effectiveStats(p2).speed || 0)
        ? [
            [p1, move1, p2],
            [p2, move2, p1],
          ]
        : [
            [p2, move2, p1],
            [p1, move1, p2],
          ];

    for (const [attacker, move, defender] of order) {
      if (battle.status !== 'active' || attacker.hp <= 0 || defender.hp <= 0) continue;
      applyAttack(attacker, move, defender, battle);
    }

    battle.pendingMoves = {};

    const loser = battle.players.find((p) => p.hp <= 0);
    if (loser) {
      battle.status = 'finished';
      battle.winnerId = battle.players.find((p) => p.hp > 0)?.userId ?? null;
      battle.log.push(
        battle.winnerId
          ? `${battle.players.find((p) => p.userId === battle.winnerId).username} venceu a batalha!`
          : 'Empate! Os dois desmaiaram ao mesmo tempo.'
      );

      if (battle.isWild && loser.isWild) {
        const humanPlayer = battle.players.find((p) => !p.isWild);
        awardXp(battle, humanPlayer, loser);
      }
    }
  }

  function handleCatchAttempt(battle, humanPlayer) {
    const db = readDb();
    const user = db.users.find((u) => u.id === humanPlayer.userId);
    if (!user || user.dayonballs <= 0) {
      battle.log.push('Você não tem mais Dayonballs!');
      return;
    }

    const wild = battle.players.find((p) => p.isWild);
    user.dayonballs -= 1;

    const missingRatio = 1 - wild.hp / wild.maxHp;
    const chance = 30 + Math.round(20 * missingRatio);
    const success = Math.random() * 100 < chance;

    if (success) {
      const newOwned = {
        id: db.ownedCreatures.reduce((max, o) => Math.max(max, o.id), 0) + 1,
        userId: user.id,
        speciesId: wild.speciesId,
        level: wild.level,
        xp: 0,
        createdAt: new Date().toISOString(),
      };
      db.ownedCreatures.push(newOwned);
      battle.status = 'finished';
      battle.captured = true;
      battle.log.push(`Você jogou uma Dayonball... Capturou ${wild.creature.name}!`);
      writeDb(db);
      return;
    }

    battle.log.push(`Você jogou uma Dayonball... ${wild.creature.name} escapou!`);
    writeDb(db);

    const aiMoveId = pickAiMove(wild, humanPlayer);
    const move = findMove(wild, aiMoveId);
    applyAttack(wild, move, humanPlayer, battle);

    if (humanPlayer.hp <= 0) {
      battle.status = 'finished';
      battle.log.push(`Seu ${humanPlayer.creature.name} desmaiou!`);
    }
  }

  function serializeBattle(battle) {
    const db = readDb();
    return {
      roomId: battle.roomId,
      isWild: !!battle.isWild,
      status: battle.status,
      winnerId: battle.winnerId,
      captured: !!battle.captured,
      fled: !!battle.fled,
      wildFled: !!battle.wildFled,
      xpGained: battle.xpGained ?? null,
      leveledUp: !!battle.leveledUp,
      newLevel: battle.newLevel ?? null,
      log: battle.log.slice(-30),
      players: battle.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        photoUrl: p.photoUrl,
        isWild: !!p.isWild,
        level: p.isWild ? p.level : p.creature?.level,
        hp: p.hp,
        maxHp: p.maxHp,
        creature: p.creature && {
          name: p.creature.name,
          imageUrl: p.creature.imageUrl,
          attacks: p.creature.attacks,
        },
        usesLeft: p.usesLeft,
        statusEffects: p.statusEffects || {},
        lockedIn: battle.pendingMoves[p.userId] != null,
        dayonballs: p.isWild ? undefined : db.users.find((u) => u.id === p.userId)?.dayonballs ?? 0,
      })),
    };
  }

  io.on('connection', (socket) => {
    socket.on('arena:join', () => {
      socket.join('arena');
      if (!arenaPresence.has(socket.userId)) arenaPresence.set(socket.userId, new Set());
      arenaPresence.get(socket.userId).add(socket.id);
      broadcastArena();
    });

    socket.on('arena:leave', () => leaveArena(socket));

    socket.on('challenge:send', (targetUserId) => {
      if (targetUserId === socket.userId) return;
      if (!arenaPresence.has(targetUserId)) return;

      const challengeId = nextChallengeId++;
      pendingChallenges.set(challengeId, { fromUserId: socket.userId, toUserId: targetUserId });

      const db = readDb();
      const fromUser = db.users.find((u) => u.id === socket.userId);
      if (!fromUser) return;

      io.to([...arenaPresence.get(targetUserId)]).emit('challenge:received', {
        challengeId,
        from: { id: fromUser.id, username: fromUser.username, photoUrl: fromUser.photoUrl || null },
      });
    });

    socket.on('challenge:respond', ({ challengeId, accept }) => {
      const challenge = pendingChallenges.get(challengeId);
      if (!challenge || challenge.toUserId !== socket.userId) return;
      pendingChallenges.delete(challengeId);

      const fromSockets = arenaPresence.get(challenge.fromUserId);

      if (!accept) {
        if (fromSockets) io.to([...fromSockets]).emit('challenge:declined', { challengeId });
        return;
      }

      const db = readDb();
      const roomId = `battle-${challenge.fromUserId}-${challenge.toUserId}-${Date.now()}`;
      const playerA = buildBattlePlayer(db, challenge.fromUserId);
      const playerB = buildBattlePlayer(db, challenge.toUserId);
      createBattle(roomId, playerA, playerB);

      const targetSockets = arenaPresence.get(challenge.toUserId) || new Set();
      [...(fromSockets || []), ...targetSockets].forEach((sid) => {
        io.sockets.sockets.get(sid)?.join(roomId);
      });

      io.to(roomId).emit('battle:start', { roomId });
    });

    socket.on('battle:join', (roomId) => {
      const battle = battles.get(roomId);
      if (!battle) return;
      const isParticipant = battle.players.some((p) => p.userId === socket.userId);
      if (!isParticipant) return;

      socket.join(roomId);
      socket.emit('battle:state', serializeBattle(battle));
    });

    socket.on('adventure:encounter', (data, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      const db = readDb();
      const battle = createWildBattle(db, socket.userId);
      if (!battle) {
        ack({ error: 'Não foi possível iniciar o encontro.' });
        return;
      }
      socket.join(battle.roomId);
      ack({ roomId: battle.roomId });
    });

    socket.on('battle:selectMove', ({ roomId, attackId }) => {
      const battle = battles.get(roomId);
      if (!battle || battle.status !== 'active') return;

      const player = battle.players.find((p) => p.userId === socket.userId);
      if (!player || player.isWild) return;
      if (battle.pendingMoves[socket.userId] != null) return;

      if (attackId === 'run') {
        if (!battle.isWild) return;
        battle.status = 'finished';
        battle.fled = true;
        battle.log.push(`${player.username} fugiu do combate.`);
        io.to(roomId).emit('battle:state', serializeBattle(battle));
        return;
      }

      if (attackId === 'dayonball') {
        if (!battle.isWild) return;
        handleCatchAttempt(battle, player);
        io.to(roomId).emit('battle:state', serializeBattle(battle));
        return;
      }

      const opponent = battle.players.find((p) => p.userId !== socket.userId);

      if (attackId === 'struggle') {
        if (hasUsableMove(player, opponent)) return;
      } else {
        const move = findMove(player, attackId);
        if (!move || !moveIsUsable(player, move, opponent)) return;
      }

      battle.pendingMoves[socket.userId] = attackId;

      if (battle.isWild) {
        const wild = battle.players.find((p) => p.isWild);
        if (wildTriesToFlee(wild)) {
          battle.status = 'finished';
          battle.wildFled = true;
          battle.log.push(`${wild.creature.name} fugiu apavorado(a)!`);
          io.to(roomId).emit('battle:state', serializeBattle(battle));
          return;
        }
        battle.pendingMoves[wild.userId] = pickAiMove(wild, player);
      }

      if (Object.keys(battle.pendingMoves).length === battle.players.length) {
        resolveTurn(battle);
      }

      io.to(roomId).emit('battle:state', serializeBattle(battle));
    });

    socket.on('disconnect', () => leaveArena(socket));
  });

  return io;
}

module.exports = attachSocket;
