import { Link } from 'react-router-dom';
import CreatureImage from './CreatureImage';
import TypeBadge from './TypeBadge';

export default function CreatureCard({ creature }) {
  return (
    <Link to={`/criatura/${creature.number}`} className="creature-card">
      <div className="creature-card-img">
        <CreatureImage creature={creature} size="small" />
      </div>
      <div className="creature-card-number">Nº {String(creature.number).padStart(4, '0')}</div>
      <div className="creature-card-name">{creature.name}</div>
      <div className="creature-card-types">
        {creature.types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>
    </Link>
  );
}
