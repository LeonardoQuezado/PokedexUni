import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadUserPhoto } from '../api';

export default function ProfilePage() {
  const { user, ownedCreatures, refresh, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await uploadUserPhoto(file);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  if (loading) return <p className="status-msg">Carregando...</p>;
  if (!user) return <p className="status-msg">Você precisa entrar para ver seu perfil.</p>;

  return (
    <div className="page auth-page">
      <h1>Meu perfil</h1>

      <div className="profile-photo-row">
        {user.photoUrl ? (
          <img className="profile-photo" src={user.photoUrl} alt={user.username} />
        ) : (
          <div className="profile-photo profile-photo-placeholder">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
        <label className="btn-upload">
          {busy ? 'Enviando...' : '📷 Trocar foto'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFile}
            hidden
            disabled={busy}
          />
        </label>
      </div>
      {error && <p className="status-msg error">{error}</p>}

      <div className="info-box" style={{ marginTop: 20 }}>
        <div>
          <span className="info-label">Usuário</span>
          <span className="info-value">{user.username}</span>
        </div>
        <div>
          <span className="info-label">E-mail</span>
          <span className="info-value">{user.email}</span>
        </div>
      </div>

      <h2>Minhas criaturas</h2>
      <div className="badge-row">
        {ownedCreatures.length === 0 && <span className="muted">Nenhuma criatura ainda.</span>}
        {ownedCreatures.map((c) => (
          <span key={c.id} className="type-badge" style={{ backgroundColor: '#2894d1' }}>
            {c.name} (Nº {String(c.number).padStart(4, '0')})
          </span>
        ))}
      </div>
    </div>
  );
}
