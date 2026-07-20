import { Link } from 'react-router-dom';
import CreatureImage from './CreatureImage';
import TypeBadge from './TypeBadge';

export default function EvolutionChain({ chain, currentId }) {
  if (!chain || chain.length < 2) return null;

  return (
    <div className="evolution-box">
      <h2 className="evolution-title">Evoluções</h2>
      <div className="evolution-row">
        {chain.map((c, i) => (
          <div className="evolution-step" key={c.id}>
            {i > 0 && (
              <span className="evolution-arrow" aria-hidden="true">
                ›
              </span>
            )}
            <Link
              to={`/criatura/${c.number}`}
              className={`evolution-item${c.id === currentId ? ' current' : ''}`}
            >
              <div className="evolution-thumb">
                <CreatureImage creature={c} size="small" />
              </div>
              <span className="evolution-name">
                {c.name} <span className="evolution-number">Nº {String(c.number).padStart(4, '0')}</span>
              </span>
              <div className="evolution-types">
                {c.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
