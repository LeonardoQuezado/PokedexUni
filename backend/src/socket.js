const { Server } = require('socket.io');
const { verifyToken, COOKIE_NAME } = require('./auth');
const { readDb, enrichOwnedCreatures } = require('./db');
const { STRUGGLE, USES_PER_MOVE, calculateDamage } = require('./attacks');

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

  function createBattle(roomId, playerA, playerB) {
    const state = {
      roomId,
      status: 'active',
      winnerId: null,
      log: [],
      players: [playerA, playerB],
      pendingMoves: {},
    };
    battles.set(roomId, state);
    return state;
  }

  function findMove(player, attackId) {
    if (attackId === 'struggle') return STRUGGLE;
    return (player.creature?.attacks || []).find((a) => a.id === attackId) || null;
  }

  function hasUsableMove(player) {
    return (player.creature?.attacks || []).some((a) => (player.usesLeft[a.id] ?? 0) > 0);
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

      if (move.id !== 'struggle') {
        attacker.usesLeft[move.id] = Math.max(0, (attacker.usesLeft[move.id] ?? 0) - 1);
      }

      const hits = Math.random() * 100 < move.accuracy;
      if (!hits) {
        battle.log.push(`${attacker.username} usou ${move.name}, mas errou!`);
        continue;
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

  function serializeBattle(battle) {
    return {
      roomId: battle.roomId,
      status: battle.status,
      winnerId: battle.winnerId,
      log: battle.log.slice(-30),
      players: battle.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        photoUrl: p.photoUrl,
        hp: p.hp,
        maxHp: p.maxHp,
        creature: p.creature && {
          name: p.creature.name,
          imageUrl: p.creature.imageUrl,
          attacks: p.creature.attacks,
        },
        usesLeft: p.usesLeft,
        lockedIn: battle.pendingMoves[p.userId] != null,
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

    socket.on('battle:selectMove', ({ roomId, attackId }) => {
      const battle = battles.get(roomId);
      if (!battle || battle.status !== 'active') return;

      const player = battle.players.find((p) => p.userId === socket.userId);
      if (!player) return;
      if (battle.pendingMoves[socket.userId] != null) return;

      if (attackId === 'struggle') {
        if (hasUsableMove(player)) return;
      } else {
        const move = findMove(player, attackId);
        if (!move || (player.usesLeft[move.id] ?? 0) <= 0) return;
      }

      battle.pendingMoves[socket.userId] = attackId;

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
