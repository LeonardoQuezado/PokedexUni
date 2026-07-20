import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../socket';
import ArenaBackground from '../components/ArenaBackground';

export default function ArenaPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [online, setOnline] = useState([]);
  const [incoming, setIncoming] = useState(null);
  const [sentTo, setSentTo] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (loading || !user) return undefined;

    const socket = getSocket();
    socket.connect();
    socket.emit('arena:join');

    function handleOnline(list) {
      setOnline(list);
    }
    function handleChallenge(payload) {
      setIncoming(payload);
    }
    function handleDeclined() {
      setSentTo(null);
      setNotice('Desafio recusado.');
      setTimeout(() => setNotice(null), 4000);
    }
    function handleBattleStart(payload) {
      navigate(`/arena/batalha/${payload.roomId}`, { state: { players: payload.players } });
    }

    socket.on('arena:online', handleOnline);
    socket.on('challenge:received', handleChallenge);
    socket.on('challenge:declined', handleDeclined);
    socket.on('battle:start', handleBattleStart);

    return () => {
      socket.emit('arena:leave');
      socket.off('arena:online', handleOnline);
      socket.off('challenge:received', handleChallenge);
      socket.off('challenge:declined', handleDeclined);
      socket.off('battle:start', handleBattleStart);
      socket.disconnect();
    };
  }, [loading, user, navigate]);

  function sendChallenge(targetId) {
    getSocket().emit('challenge:send', targetId);
    setSentTo(targetId);
  }

  function respond(accept) {
    if (!incoming) return;
    getSocket().emit('challenge:respond', { challengeId: incoming.challengeId, accept });
    setIncoming(null);
  }

  if (loading) return <p className="status-msg">Carregando...</p>;
  if (!user) {
    return <p className="status-msg">Você precisa entrar para acessar a Arena.</p>;
  }

  const others = online.filter((o) => o.id !== user.id);

  return (
    <div className="page arena-page">
      <div className="arena-visual">
        <ArenaBackground />
      </div>

      <h1>Arena</h1>
      {notice && <p className="status-msg">{notice}</p>}

      <h2>Online agora ({others.length})</h2>
      {others.length === 0 && <p className="muted">Ninguém mais por aqui agora. Chama seu amigo!</p>}

      <div className="arena-online-list">
        {others.map((o) => (
          <div key={o.id} className="arena-online-item">
            {o.photoUrl ? (
              <img src={o.photoUrl} alt={o.username} className="arena-online-photo" />
            ) : (
              <div className="arena-online-photo arena-online-photo-placeholder">
                {o.username.charAt(0).toUpperCase()}
              </div>
            )}
            <span>{o.username}</span>
            <button
              type="button"
              className="btn-arena-challenge"
              disabled={sentTo === o.id}
              onClick={() => sendChallenge(o.id)}
            >
              {sentTo === o.id ? 'Aguardando...' : 'Desafiar'}
            </button>
          </div>
        ))}
      </div>

      {incoming && (
        <div className="challenge-modal-backdrop">
          <div className="challenge-modal">
            <p>
              <strong>{incoming.from.username}</strong> te desafiou para uma batalha!
            </p>
            <div className="challenge-modal-actions">
              <button type="button" className="btn-primary" onClick={() => respond(true)}>
                Aceitar
              </button>
              <button type="button" className="btn-secondary" onClick={() => respond(false)}>
                Recusar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
