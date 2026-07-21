import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import CreatureCard from '../components/CreatureCard';
import { fetchCreatures } from '../api';

export default function ListPage() {
  const [creatures, setCreatures] = useState([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('number-asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCreatures()
      .then((data) => {
        if (!cancelled) setCreatures(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = creatures;
    if (q) {
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || String(c.number).padStart(4, '0').includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sort === 'name-asc') return a.name.localeCompare(b.name);
      if (sort === 'name-desc') return b.name.localeCompare(a.name);
      if (sort === 'number-desc') return b.number - a.number;
      return a.number - b.number;
    });
    return list;
  }, [creatures, query, sort]);

  function surpreendaMe() {
    if (creatures.length === 0) return;
    const random = creatures[Math.floor(Math.random() * creatures.length)];
    navigate(`/criatura/${random.number}`);
  }

  return (
    <div className="page list-page">
      <div className="hero">
        <h1>Pokédex</h1>
        <SearchBar value={query} onChange={setQuery} />
      </div>

      <div className="toolbar">
        <button type="button" className="btn-random" onClick={surpreendaMe}>
          🔀 Surpreenda-me!
        </button>
        <div className="sort-control">
          <label htmlFor="sort-select">Organizar por</label>
          <select id="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="number-asc">Menor número primeiro</option>
            <option value="number-desc">Maior número primeiro</option>
            <option value="name-asc">Nome (A-Z)</option>
            <option value="name-desc">Nome (Z-A)</option>
          </select>
        </div>
        <Link to="/nova" className="btn-new">
          + Nova criatura
        </Link>
      </div>

      {loading && <p className="status-msg">Carregando criaturas...</p>}
      {error && <p className="status-msg error">Erro ao carregar: {error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="status-msg">Nenhuma criatura encontrada.</p>
      )}

      <div className="creature-grid">
        {filtered.map((c) => (
          <CreatureCard key={c.id} creature={c} />
        ))}
      </div>
    </div>
  );
}
