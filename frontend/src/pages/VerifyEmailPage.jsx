import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Link de verificação inválido.');
      return;
    }
    if (calledRef.current) return;
    calledRef.current = true;

    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setError(err.message);
      });
  }, [token]);

  return (
    <div className="page auth-page">
      <h1>Confirmação de conta</h1>
      {status === 'loading' && <p className="status-msg">Confirmando...</p>}
      {status === 'success' && (
        <>
          <p>Conta confirmada com sucesso!</p>
          <Link to="/entrar" className="btn-primary">
            Entrar agora
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <p className="status-msg error">{error}</p>
          <Link to="/entrar">Voltar para o login</Link>
        </>
      )}
    </div>
  );
}
