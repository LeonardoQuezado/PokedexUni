import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className="site-header">
      <Link to="/" className="brand">
        <span className="brand-icon" aria-hidden="true">◉</span>
        <span className="brand-text">Unidex</span>
      </Link>
      <nav className="header-nav">
        <Link to="/nova" className="btn-nova">
          + Nova criatura
        </Link>
        {user && (
          <Link to="/arena" className="btn-arena">
            ⚔️ Arena
          </Link>
        )}
        {user && (
          <Link to="/aventura" className="btn-adventure">
            🗺️ Aventura
          </Link>
        )}
        {user ? (
          <>
            <Link to="/perfil" className="header-user">
              {user.username}
            </Link>
            <button type="button" className="btn-link" onClick={handleLogout}>
              Sair
            </button>
          </>
        ) : (
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
