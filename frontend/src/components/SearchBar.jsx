export default function SearchBar({ value, onChange }) {
  return (
    <div className="search-section">
      <label htmlFor="search-input">Nome ou número</label>
      <div className="search-row">
        <input
          id="search-input"
          type="text"
          placeholder="Ex: Dayon ou 0001"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="search-icon" aria-hidden="true">🔍</span>
      </div>
      <p className="search-hint">Pesquise pelo nome ou número da criatura na Pokédex.</p>
    </div>
  );
}
