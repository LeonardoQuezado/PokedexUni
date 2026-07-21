import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchCreatures } from '../api';

const PATCH_NOTES = [
  {
    tag: 'v0.4',
    title: 'Aventura e captura de Dayons selvagens',
    body: 'Explore o Bloco D no mapa do campus, encontre Dayons selvagens e capture com Dayonballs.',
  },
  {
    tag: 'v0.3',
    title: 'Sistema de combate',
    body: 'Ataques configuráveis (tipo, categoria, poder, precisão) e batalhas por turno com HP de verdade.',
  },
  {
    tag: 'v0.2',
    title: 'Arena e contas de treinador',
    body: 'Crie uma conta, veja quem está online na Arena e desafie outros treinadores em tempo real.',
  },
  {
    tag: 'v0.1',
    title: 'Lançamento da Dayonmon',
    body: 'Pokédex de criaturas personalizadas no ar, com Dayon, Terrion, Nimbukin e Ignivox.',
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const [images, setImages] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    fetchCreatures()
      .then((list) => setImages(list.filter((c) => c.imageUrl).map((c) => c.imageUrl)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (images.length < 2) return undefined;
    const timer = setInterval(() => setActiveIdx((i) => (i + 1) % images.length), 5000);
    return () => clearInterval(timer);
  }, [images]);

  return (
    <div className="home-page">
      <div className="home-hero">
        {images.length === 0 && <div className="home-hero-fallback" />}
        {images.map((src, i) => (
          <div
            key={src}
            className={`home-hero-bg${i === activeIdx ? ' active' : ''}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        <div className="home-hero-overlay" />
        <div className="home-hero-content">
          <h1>Dayonmon</h1>
          <p>
            A Pokédex das suas próprias criaturas. Cadastre, evolua, batalhe na Arena e capture
            Dayons selvagens na Aventura.
          </p>
          <div className="home-hero-actions">
            <Link to="/dex" className="primary">
              Ver a Pokédex
            </Link>
            <Link to="/arena" className="secondary">
              Ir para a Arena
            </Link>
          </div>
        </div>
      </div>

      <div className="home-section">
        <h2>Acesso rápido</h2>
        <div className="quick-links">
          <Link to="/dex" className="quick-link-card">
            <h3>📖 Pokédex</h3>
            <p>Veja e cadastre criaturas</p>
          </Link>
          <Link to="/arena" className="quick-link-card">
            <h3>⚔️ Arena</h3>
            <p>Desafie outros treinadores</p>
          </Link>
          <Link to="/aventura" className="quick-link-card">
            <h3>🗺️ Aventura</h3>
            <p>Explore e capture Dayons selvagens</p>
          </Link>
          <Link to="/perfil" className="quick-link-card">
            <h3>👤 Meu perfil</h3>
            <p>{user ? `Bem-vindo, ${user.username}` : 'Sua conta'}</p>
          </Link>
        </div>
      </div>

      <div className="home-section">
        <h2>Novidades</h2>
        <div className="news-list">
          {PATCH_NOTES.map((note) => (
            <div className="news-card" key={note.tag}>
              <span className="news-card-tag">{note.tag}</span>
              <h3>{note.title}</h3>
              <p>{note.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
