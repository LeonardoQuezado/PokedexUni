import { Link, useLocation, useParams } from 'react-router-dom';
import ArenaBackground from '../components/ArenaBackground';

function BattlePlayerCard({ player, side }) {
  return (
    <div className={`battle-player battle-player-${side}`}>
      {player.photoUrl ? (
        <img src={player.photoUrl} alt={player.username} className="battle-player-photo" />
      ) : (
        <div className="battle-player-photo battle-player-photo-placeholder">
          {player.username.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="battle-player-name">{player.username}</span>
      {player.creature ? (
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
      ) : (
        <span className="muted">Sem criatura</span>
      )}
    </div>
  );
}

export default function BattleRoomPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const players = location.state?.players;

  if (!players) {
    return (
      <div className="page">
        <p className="status-msg">
          Sessão de batalha não encontrada — isso acontece se você recarregar a página.
        </p>
        <Link to="/arena">← Voltar para a Arena</Link>
      </div>
    );
  }

  const [a, b] = players;

  return (
    <div className="page battle-room-page">
      <div className="arena-visual battle-visual">
        <ArenaBackground />
        <div className="battle-players">
          <BattlePlayerCard player={a} side="left" />
          <div className="battle-vs">VS</div>
          <BattlePlayerCard player={b} side="right" />
        </div>
      </div>

      <p className="hint battle-room-hint">
        Sala #{roomId.slice(-6)} — combinem entre vocês como a batalha acontece a partir daqui.
      </p>
      <div className="battle-room-actions">
        <Link to="/arena" className="btn-secondary">
          ← Voltar para a Arena
        </Link>
      </div>
    </div>
  );
}
