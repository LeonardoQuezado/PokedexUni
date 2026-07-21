import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resendVerification, fetchCreature } from '../api';
import AuthBackground from '../components/AuthBackground';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendLink, setResendLink] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bgImage, setBgImage] = useState(null);

  useEffect(() => {
    fetchCreature(1)
      .then((c) => setBgImage(c.imageUrl || null))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResendLink(null);
    setSaving(true);
    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
      if (err.needsVerification) setNeedsVerification(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleResend() {
    try {
      const data = await resendVerification(identifier);
      setResendLink(data.verificationLink);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AuthBackground imageUrl={bgImage}>
      <div className="page auth-page">
        <h1>Entrar</h1>
        {error && <p className="status-msg error">{error}</p>}
        <form className="creature-form" onSubmit={handleSubmit}>
          <label className="full">
            Usuário ou e-mail
            <input required value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </label>
          <label className="full">
            Senha
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <div className="form-actions full">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>

        {needsVerification && (
          <p className="hint">
            Perdeu o link de confirmação?{' '}
            <button type="button" className="btn-secondary" onClick={handleResend}>
              Gerar link de novo
            </button>
          </p>
        )}
        {resendLink && (
          <p>
            <Link to={resendLink} className="btn-primary">
              Confirmar conta
            </Link>
          </p>
        )}

        <p className="hint">
          Ainda não tem conta? <Link to="/cadastrar">Criar conta</Link>
        </p>
      </div>
    </AuthBackground>
  );
}
