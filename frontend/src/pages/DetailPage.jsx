import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import CreatureImage from '../components/CreatureImage';
import TypeBadge from '../components/TypeBadge';
import StatBar from '../components/StatBar';
import ImageUploader from '../components/ImageUploader';
import EvolutionChain from '../components/EvolutionChain';
import { fetchCreature, deleteCreature } from '../api';

export default function DetailPage() {
  const { idOrNumber } = useParams();
  const navigate = useNavigate();
  const [creature, setCreature] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchCreature(idOrNumber)
      .then(setCreature)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [idOrNumber]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!window.confirm(`Remover ${creature.name} da Dex?`)) return;
    await deleteCreature(creature.id);
    navigate('/');
  }

  if (loading) return <p className="status-msg">Carregando...</p>;
  if (error) return <p className="status-msg error">Erro: {error}</p>;
  if (!creature) return null;

  return (
    <div className="page detail-page">
      <Link to="/" className="back-link">
        ← Voltar para a Dex
      </Link>

      <div className="detail-grid">
        <div className="detail-media">
          <CreatureImage creature={creature} size="large" />
          <ImageUploader creatureId={creature.id} onUploaded={load} />
        </div>

        <div className="detail-info">
          <div className="detail-heading">
            <h1>{creature.name}</h1>
            <span className="detail-number">Nº {String(creature.number).padStart(4, '0')}</span>
          </div>

          <p className="detail-description">
            {creature.description || 'Sem descrição cadastrada ainda.'}
          </p>

          <div className="info-box">
            <div>
              <span className="info-label">Altura</span>
              <span className="info-value">{creature.height != null ? `${creature.height} m` : '—'}</span>
            </div>
            <div>
              <span className="info-label">Categoria</span>
              <span className="info-value">{creature.category || '—'}</span>
            </div>
            <div>
              <span className="info-label">Peso</span>
              <span className="info-value">{creature.weight != null ? `${creature.weight} kg` : '—'}</span>
            </div>
            <div>
              <span className="info-label">Habilidades</span>
              <span className="info-value">
                {creature.abilities?.length ? creature.abilities.join(', ') : '—'}
              </span>
            </div>
            <div>
              <span className="info-label">Gênero</span>
              <span className="info-value">{creature.genderless ? 'Nenhum' : 'Não definido'}</span>
            </div>
          </div>

          <h2>Tipo</h2>
          <div className="badge-row">
            {creature.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>

          <h2>Fraquezas</h2>
          <div className="badge-row">
            {creature.weaknesses?.length ? (
              creature.weaknesses.map((t) => <TypeBadge key={t} type={t} />)
            ) : (
              <span className="muted">Nenhuma fraqueza cadastrada.</span>
            )}
          </div>

          <h2>Ataques</h2>
          {creature.attacks?.length ? (
            <ul className="attack-list">
              {creature.attacks.map((a) => (
                <li key={a.id}>
                  <strong>{a.name}</strong>
                  {a.type && <TypeBadge type={a.type} />}
                  <span className="muted">
                    {' '}
                    · {a.category === 'especial' ? 'Especial' : 'Físico'} · Poder {a.power} · Precisão {a.accuracy}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Ainda sem ataques cadastrados — em breve!</p>
          )}

          <h2>Estatísticas</h2>
          <div className="stats-box">
            <StatBar label="PS" value={creature.stats.hp} />
            <StatBar label="Ataque" value={creature.stats.attack} />
            <StatBar label="Defesa" value={creature.stats.defense} />
            <StatBar label="Atq. Especial" value={creature.stats.spAttack} />
            <StatBar label="Def. Especial" value={creature.stats.spDefense} />
            <StatBar label="Velocidade" value={creature.stats.speed} />
          </div>

          <EvolutionChain chain={creature.evolutionChain} currentId={creature.id} />

          <div className="detail-actions">
            <Link to={`/criatura/${creature.number}/editar`} className="btn-secondary">
              ✏️ Editar
            </Link>
            <button type="button" className="btn-danger" onClick={handleDelete}>
              🗑️ Remover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
