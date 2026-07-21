export default function MoveGrid({ attacks, usesLeft, onPick }) {
  const showStruggle = attacks.every((a) => (usesLeft[a.id] ?? 0) <= 0);

  return (
    <>
      <div className="move-grid">
        {attacks.map((a) => {
          const uses = usesLeft[a.id] ?? 0;
          return (
            <button
              key={a.id}
              type="button"
              className="btn-move"
              disabled={uses <= 0}
              onClick={() => onPick(a.id)}
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
        <button type="button" className="btn-move btn-move-struggle" onClick={() => onPick('struggle')}>
          <span className="move-name">Investida Desesperada</span>
          <span className="move-meta">Sem ataques restantes — golpe fraco de emergência</span>
        </button>
      )}
    </>
  );
}
