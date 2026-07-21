import { Link } from 'react-router-dom';

const LOCATIONS = [
  {
    id: 'bloco-d',
    name: 'Bloco D',
    available: true,
    path: '/aventura/bloco-d',
    shape: { top: '10%', left: '62%', width: '27%', height: '42%' },
  },
];

export default function AdventurePage() {
  return (
    <div className="page adventure-page">
      <h1>Aventura</h1>
      <p className="hint">Escolha um local no mapa para explorar. Passe o mouse para ver os locais disponíveis.</p>

      <div className="world-map">
        <img src="/aventura/mapa-campus.jpg" alt="Mapa do campus" className="world-map-img" />
        {LOCATIONS.map((loc) => {
          const label = <span className="world-map-spot-label">{loc.name}</span>;

          return loc.available ? (
            <Link
              key={loc.id}
              to={loc.path}
              className="world-map-spot available"
              style={loc.shape}
              title={loc.name}
            >
              {label}
            </Link>
          ) : (
            <div
              key={loc.id}
              className="world-map-spot disabled"
              style={loc.shape}
              title={`${loc.name} (em breve)`}
            >
              {label}
            </div>
          );
        })}
      </div>

      <p className="muted">Mais locais serão liberados no futuro.</p>
    </div>
  );
}
