import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/entrar');
  }

  return (
    <header className="site-header">
      <Link to="/" className="brand">
        <span className="brand-icon" aria-hidden="true">◉</span>
        <span className="brand-text">Dayonmon</span>
      </Link>
      <nav className="header-nav">
        {user && (
          <>
            <Link to="/dex" className="header-link">
              Pokédex
            </Link>
            {user.isAdmin && (
              <Link to="/nova" className="btn-nova">
                + Nova criatura
              </Link>
            )}
            <Link to="/arena" className="btn-arena">
              ⚔️ Arena
            </Link>
            <Link to="/aventura" className="btn-adventure">
              🗺️ Aventura
            </Link>
            <Link to="/loja" className="header-link">
              🛒 Loja
            </Link>
            <Link to="/ranking" className="header-link">
              🏆 Ranking
            </Link>
            <span className="header-gold" title="Seu ouro">
              💰 {user.gold ?? 0}g
            </span>
            <Link to="/perfil" className="header-user">
              {user.username}
            </Link>
            <button type="button" className="btn-link" onClick={handleLogout}>
              Sair
            </button>
          </>
        )}
        {!user && (
          <>
            <Link to="/entrar" className="header-link">
              Entrar
            </Link>
            <Link to="/cadastrar" className="header-link">
              Cadastrar
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
