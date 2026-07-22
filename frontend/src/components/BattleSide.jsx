export default function BattleSide({ player }) {
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
          <span className="battle-creature-name">
            {player.creature.name}
            {player.level != null && <span className="battle-level-badge">Nv. {player.level}</span>}
          </span>
        </div>
      )}
    </div>
  );
}
