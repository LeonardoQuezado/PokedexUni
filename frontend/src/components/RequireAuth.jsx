import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="status-msg">Carregando...</p>;
  if (!user) return <Navigate to="/entrar" replace state={{ from: location }} />;
  return children;
}
