const PANCADA = { id: 'pancada', name: 'Pancada', type: null, category: 'fisico', power: 45, accuracy: 100 };

function lockReason(attack, opponentStatus, selfStatus) {
  if (attack.effect?.kind === 'requiresStatus' && !opponentStatus?.[attack.effect.status]) {
    return `Requer inimigo ${attack.effect.status}`;
  }
  if (attack.effect?.requiresSelfStatus && !selfStatus?.[attack.effect.requiresSelfStatus]) {
    return 'Requer autobuff prévio';
  }
  return null;
}

export default function MoveGrid({ attacks, onPick, opponentStatus = {}, selfStatus = {} }) {
  const allAttacks = [...attacks, PANCADA];

  return (
    <div className="move-grid">
      {allAttacks.map((a) => {
        const locked = lockReason(a, opponentStatus, selfStatus);
        return (
          <button key={a.id} type="button" className="btn-move" disabled={!!locked} onClick={() => onPick(a.id)}>
            <span className="move-name">{a.name}</span>
            <span className="move-meta">
              {a.type || 'Sem tipo'} · Pot. {a.power} · {a.category === 'especial' ? 'Especial' : 'Físico'}
            </span>
            {locked && <span className="move-locked">🔒 {locked}</span>}
          </button>
        );
      })}
    </div>
  );
}
