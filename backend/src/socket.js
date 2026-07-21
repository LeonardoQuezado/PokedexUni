const { Server } = require('socket.io');
const { verifyToken, COOKIE_NAME } = require('./auth');
const { readDb, writeDb, enrichOwnedCreatures } = require('./db');
const { STRUGGLE, USES_PER_MOVE, normalizeAttacks, calculateDamage } = require('./attacks');

const WILD_USER_ID = -1;
const WILD_SPECIES_NUMBER = 1; // Dayon is the only catchable species for now

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
      usesLeft: creature ? Object.fromEntries(creature.attacks.map((a) => [a.id, USES_PER_MOVE])) : {},
    };
  }

  function buildWildPlayer(species) {
    const attacks = normalizeAttacks(species.attacks);
    const creature = {
      name: species.name,
      imageUrl: species.imageUrl || null,
      stats: species.stats,
      weaknesses: species.weaknesses || [],
      attacks,
    };
    return {
      userId: WILD_USER_ID,
      username: `${species.name} selvagem`,
      photoUrl: species.imageUrl || null,
      isWild: true,
      speciesId: species.id,
      creature,
      hp: species.stats.hp,
      maxHp: species.stats.hp,
      usesLeft: Object.fromEntries(attacks.map((a) => [a.id, USES_PER_MOVE])),
    };
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
    const species = db.creatures.find((c) => c.number === WILD_SPECIES_NUMBER);
    if (!species) return null;

    const human = buildBattlePlayer(db, humanUserId);
    if (!human.creature) return null;

    const wild = buildWildPlayer(species);
    const roomId = `wild-${humanUserId}-${Date.now()}`;
    return createBattle(roomId, human, wild, {
      isWild: true,
      captured: false,
      fled: false,
      log: [`Um ${species.name} selvagem apareceu!`],
    });
  }

  function findMove(player, attackId) {
    if (attackId === 'struggle') return STRUGGLE;
    return (player.creature?.attacks || []).find((a) => a.id === attackId) || null;
  }

  function hasUsableMove(player) {
    return (player.creature?.attacks || []).some((a) => (player.usesLeft[a.id] ?? 0) > 0);
  }

  function pickAiMove(player) {
    const usable = (player.creature?.attacks || []).filter((a) => (player.usesLeft[a.id] ?? 0) > 0);
    if (usable.length === 0) return 'struggle';
    return usable[Math.floor(Math.random() * usable.length)].id;
  }

  function applyAttack(attacker, move, defender, battle) {
    if (move.id !== 'struggle') {
      attacker.usesLeft[move.id] = Math.max(0, (attacker.usesLeft[move.id] ?? 0) - 1);
    }
    const hits = Math.random() * 100 < move.accuracy;
    if (!hits) {
      battle.log.push(`${attacker.username} usou ${move.name}, mas errou!`);
      return;
    }
    const { damage, effective } = calculateDamage(
      attacker.creature.stats,
      defender.creature.stats,
      defender.creature.weaknesses,
      move
    );
    defender.hp = Math.max(0, defender.hp - damage);
    battle.log.push(
      `${attacker.username} usou ${move.name}! Causou ${damage} de dano${effective ? ' (super efetivo!)' : ''}.`
    );
  }

  function resolveTurn(battle) {
    const [p1, p2] = battle.players;
    const move1 = findMove(p1, battle.pendingMoves[p1.userId]);
    const move2 = findMove(p2, battle.pendingMoves[p2.userId]);
    if (!move1 || !move2) return;

    const order =
      (p1.creature?.stats.speed || 0) >= (p2.creature?.stats.speed || 0)
        ? [
            [p1, move1, p2],
            [p2, move2, p1],
          ]
        : [
            [p2, move2, p1],
            [p1, move1, p2],
          ];

    for (const [attacker, move, defender] of order) {
      if (attacker.hp <= 0 || defender.hp <= 0) continue;
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

    const aiMoveId = pickAiMove(wild);
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
      log: battle.log.slice(-30),
      players: battle.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        photoUrl: p.photoUrl,
        isWild: !!p.isWild,
        hp: p.hp,
        maxHp: p.maxHp,
        creature: p.creature && {
          name: p.creature.name,
          imageUrl: p.creature.imageUrl,
          attacks: p.creature.attacks,
        },
        usesLeft: p.usesLeft,
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

      if (attackId === 'struggle') {
        if (hasUsableMove(player)) return;
      } else {
        const move = findMove(player, attackId);
        if (!move || (player.usesLeft[move.id] ?? 0) <= 0) return;
      }

      battle.pendingMoves[socket.userId] = attackId;

      if (battle.isWild) {
        const wild = battle.players.find((p) => p.isWild);
        battle.pendingMoves[wild.userId] = pickAiMove(wild);
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
