import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ArenaBackground from '../components/ArenaBackground';

function BattleSide({ player }) {
  const pct = player.maxHp > 0 ? Math.max(0, Math.round((player.hp / player.maxHp) * 100)) : 0;

  return (
    <div className="battle-player">
      {player.photoUrl ? (
        <img src={player.photoUrl} alt={player.username} className="battle-player-photo" />
      ) : (
        <div className="battle-player-photo battle-player-photo-placeholder">
          {player.username.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="battle-player-name">{player.username}</span>
      <div className="battle-hp-track">
        <div className="battle-hp-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="battle-hp-text">
        {player.hp} / {player.maxHp} PS
      </span>
      {player.creature && (
        <div className="battle-creature">
          {player.creature.imageUrl ? (
            <img src={player.creature.imageUrl} alt={player.creature.name} className="battle-creature-photo" />
          ) : (
            <div className="battle-creature-photo battle-creature-photo-placeholder">
              {player.creature.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="battle-creature-name">{player.creature.name}</span>
        </div>
      )}
    </div>
  );
}

export default function BattleRoomPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const [battle, setBattle] = useState(null);

  useEffect(() => {
    if (!socket) return undefined;

    socket.emit('battle:join', roomId);

    function handleState(payload) {
      if (payload.roomId === roomId) setBattle(payload);
    }

    socket.on('battle:state', handleState);
    return () => socket.off('battle:state', handleState);
  }, [socket, roomId]);

  function pickMove(attackId) {
    socket?.emit('battle:selectMove', { roomId, attackId });
  }

  if (!battle) {
    return (
      <div className="page">
        <p className="status-msg">Carregando batalha... (se demorar, é porque a sala não existe mais)</p>
        <Link to="/arena">← Voltar para a Arena</Link>
      </div>
    );
  }

  const me = battle.players.find((p) => p.userId === user.id);
  const opponent = battle.players.find((p) => p.userId !== user.id);
  const isOver = battle.status === 'finished';
  const iWon = isOver && battle.winnerId === user.id;
  const draw = isOver && !battle.winnerId;
  const showStruggle = me.creature.attacks.every((a) => (me.usesLeft[a.id] ?? 0) <= 0);

  return (
    <div className="page battle-room-page">
      <div className="arena-visual battle-visual">
        <ArenaBackground />
        <div className="battle-players">
          <BattleSide player={me} />
          <div className="battle-vs">VS</div>
          <BattleSide player={opponent} />
        </div>
      </div>

      <div className="battle-log">
        {battle.log.length === 0 && <p className="muted">A batalha vai começar assim que os dois escolherem um ataque...</p>}
        {battle.log.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      {isOver ? (
        <div className="battle-over">
          <h2>{draw ? 'Empate!' : iWon ? 'Você venceu!' : `${opponent.username} venceu!`}</h2>
          <Link to="/arena" className="btn-primary">
            Voltar para a Arena
          </Link>
        </div>
      ) : (
        <div className="battle-moves">
          {me.lockedIn ? (
            <p className="status-msg">Aguardando {opponent.username}...</p>
          ) : (
            <>
              <div className="move-grid">
                {me.creature.attacks.map((a) => {
                  const uses = me.usesLeft[a.id] ?? 0;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className="btn-move"
                      disabled={uses <= 0}
                      onClick={() => pickMove(a.id)}
                    >
                      <span className="move-name">{a.name}</span>
                      <span className="move-meta">
                        {a.type || 'Sem tipo'} · Pot. {a.power} · {a.category === 'especial' ? 'Especial' : 'Físico'}
                      </span>
                      <span className="move-uses">{uses}/3 usos</span>
                    </button>
                  );
                })}
              </div>
              {showStruggle && (
                <button type="button" className="btn-move btn-move-struggle" onClick={() => pickMove('struggle')}>
                  <span className="move-name">Investida Desesperada</span>
                  <span className="move-meta">Sem ataques restantes — golpe fraco de emergência</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {!isOver && (
        <div className="battle-room-actions">
          <Link to="/arena" className="btn-secondary">
            ← Voltar para a Arena
          </Link>
        </div>
      )}
    </div>
  );
}
