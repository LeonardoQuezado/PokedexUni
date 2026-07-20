import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="brand">
        <span className="brand-icon" aria-hidden="true">◉</span>
        <span className="brand-text">Dex Uni</span>
      </Link>
      <nav>
        <Link to="/nova">+ Nova criatura</Link>
      </nav>
    </header>
  );
}
