const { Server } = require('socket.io');
const { verifyToken, COOKIE_NAME } = require('./auth');
const { readDb, enrichOwnedCreatures } = require('./db');

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
    const creatures = enrichOwnedCreatures(db, userId);
    return {
      id: user.id,
      username: user.username,
      photoUrl: user.photoUrl || null,
      creature: creatures[0] || null,
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
      const players = [buildBattlePlayer(db, challenge.fromUserId), buildBattlePlayer(db, challenge.toUserId)];

      const targetSockets = arenaPresence.get(challenge.toUserId) || new Set();
      [...(fromSockets || []), ...targetSockets].forEach((sid) => {
        io.sockets.sockets.get(sid)?.join(roomId);
      });

      io.to(roomId).emit('battle:start', { roomId, players });
    });

    socket.on('disconnect', () => leaveArena(socket));
  });

  return io;
}

module.exports = attachSocket;
