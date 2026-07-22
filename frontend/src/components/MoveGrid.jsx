function lockReason(attack, opponentStatus, selfStatus) {
  if (attack.effect?.kind === 'requiresStatus' && !opponentStatus?.[attack.effect.status]) {
    return `Requer inimigo ${attack.effect.status}`;
  }
  if (attack.effect?.requiresSelfStatus && !selfStatus?.[attack.effect.requiresSelfStatus]) {
    return 'Requer autobuff prévio';
  }
  return null;
}

export default function MoveGrid({ attacks, usesLeft, onPick, opponentStatus = {}, selfStatus = {} }) {
  const showStruggle = attacks.every(
    (a) => (usesLeft[a.id] ?? 0) <= 0 || !!lockReason(a, opponentStatus, selfStatus)
  );

  return (
    <>
      <div className="move-grid">
        {attacks.map((a) => {
          const uses = usesLeft[a.id] ?? 0;
          const locked = lockReason(a, opponentStatus, selfStatus);
          return (
            <button
              key={a.id}
              type="button"
              className="btn-move"
              disabled={uses <= 0 || !!locked}
              onClick={() => onPick(a.id)}
            >
              <span className="move-name">{a.name}</span>
              <span className="move-meta">
                {a.type || 'Sem tipo'} · Pot. {a.power} · {a.category === 'especial' ? 'Especial' : 'Físico'}
              </span>
              <span className="move-uses">{uses}/3 usos</span>
              {locked && <span className="move-locked">🔒 {locked}</span>}
            </button>
          );
        })}
      </div>
      {showStruggle && (
        <button type="button" className="btn-move btn-move-struggle" onClick={() => onPick('struggle')}>
          <span className="move-name">Investida Desesperada</span>
          <span className="move-meta">Sem ataques restantes — golpe fraco de emergência</span>
        </button>
      )}
    </>
  );
}
