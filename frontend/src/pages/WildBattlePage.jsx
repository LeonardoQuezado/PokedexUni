import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ArenaBackground from '../components/ArenaBackground';
import BattleSide from '../components/BattleSide';
import MoveGrid from '../components/MoveGrid';

export default function WildBattlePage() {
  const { roomId } = useParams();
  const { user, refresh } = useAuth();
  const socket = useSocket();
  const [battle, setBattle] = useState(null);

  useEffect(() => {
    if (!socket) return undefined;

    socket.emit('battle:join', roomId);

    function handleState(payload) {
      if (payload.roomId === roomId) {
        setBattle(payload);
        if (payload.status === 'finished') refresh();
      }
    }

    socket.on('battle:state', handleState);
    return () => socket.off('battle:state', handleState);
  }, [socket, roomId, refresh]);

  function act(attackId) {
    socket?.emit('battle:selectMove', { roomId, attackId });
  }

  if (!battle) {
    return (
      <div className="page">
        <p className="status-msg">Carregando encontro...</p>
        <Link to="/aventura">← Voltar para a Aventura</Link>
      </div>
    );
  }

  const me = battle.players.find((p) => p.userId === user.id);
  const wild = battle.players.find((p) => p.isWild);
  const isOver = battle.status === 'finished';
  const lost = isOver && me.hp <= 0;
  const wonNoCatch = isOver && !battle.captured && !battle.fled && !lost;

  return (
    <div className="page battle-room-page">
      <div className="arena-visual battle-visual">
        <ArenaBackground />
        <div className="battle-players">
          <BattleSide player={me} />
          <div className="battle-vs">VS</div>
          <BattleSide player={wild} />
        </div>
      </div>

      <div className="battle-log">
        {battle.log.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      {isOver ? (
        <div className="battle-over">
          <h2>
            {battle.captured && `Você capturou ${wild.creature.name}!`}
            {battle.fled && 'Você fugiu do combate.'}
            {wonNoCatch && `Você venceu, mas ${wild.creature.name} fugiu no susto!`}
            {lost && `Seu ${me.creature.name} desmaiou...`}
          </h2>
          <Link to="/aventura/bloco-d" className="btn-primary">
            Continuar explorando
          </Link>
        </div>
      ) : (
        <div className="battle-moves">
          {me.lockedIn ? (
            <p className="status-msg">Aguardando a reação do {wild.creature.name}...</p>
          ) : (
            <>
              <div className="wild-actions">
                <button
                  type="button"
                  className="btn-move btn-move-ball"
                  disabled={(me.dayonballs ?? 0) <= 0}
                  onClick={() => act('dayonball')}
                >
                  <span className="move-name">🔴 Dayonball</span>
                  <span className="move-meta">{me.dayonballs ?? 0} restante(s) · 30% base + até 20% pelo HP baixo</span>
                </button>
                <button type="button" className="btn-move btn-move-run" onClick={() => act('run')}>
                  <span className="move-name">🏃 Fugir</span>
                  <span className="move-meta">Sai do combate sem gastar Dayonball</span>
                </button>
              </div>
              <MoveGrid attacks={me.creature.attacks} usesLeft={me.usesLeft} onPick={act} />
            </>
          )}
        </div>
      )}

      {!isOver && (
        <div className="battle-room-actions">
          <Link to="/aventura" className="btn-secondary">
            ← Voltar para o mapa
          </Link>
        </div>
      )}
    </div>
  );
}
