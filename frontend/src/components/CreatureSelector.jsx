export default function CreatureSelector({ roster, onSelect, title }) {
  const available = (roster || []).filter((c) => !c.fainted);

  return (
    <div className="creature-selector">
      <h3>{title}</h3>
      <div className="creature-selector-grid">
        {available.map((c) => (
          <button key={c.id} type="button" className="creature-selector-card" onClick={() => onSelect(c.id)}>
            {c.imageUrl ? (
              <img src={c.imageUrl} alt={c.name} className="creature-selector-photo" />
            ) : (
              <div className="creature-selector-photo creature-placeholder">{c.name.charAt(0).toUpperCase()}</div>
            )}
            <span className="creature-selector-name">{c.name}</span>
            <span className="battle-level-badge">Nv. {c.level}</span>
            <span className="creature-selector-hp">{c.maxHp} PS</span>
          </button>
        ))}
      </div>
    </div>
  );
}
