import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ArenaBackground from '../components/ArenaBackground';
import BattleSide from '../components/BattleSide';
import MoveGrid from '../components/MoveGrid';

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
        {battle.log.length === 0 && (
          <p className="muted">A batalha vai começar assim que os dois escolherem um ataque...</p>
        )}
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
            <MoveGrid
              attacks={me.creature.attacks}
              usesLeft={me.usesLeft}
              onPick={pickMove}
              opponentStatus={opponent.statusEffects}
            />
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
