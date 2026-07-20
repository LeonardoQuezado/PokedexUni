import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerUser } from '../api';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm) {
      setError('As senhas não coincidem');
      return;
    }

    setSaving(true);
    try {
      const data = await registerUser({
        username: form.username,
        email: form.email,
        password: form.password,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    return (
      <div className="page auth-page">
        <h1>Conta criada!</h1>
        <p>
          Ainda não mandamos e-mail de verdade, então confirme sua conta clicando no link abaixo
          (isso simula o que chegaria no seu e-mail):
        </p>
        <p>
          <Link to={result.verificationLink} className="btn-primary">
            Confirmar conta
          </Link>
        </p>
        <p className="hint">
          Depois de confirmar, faça login <Link to="/entrar">aqui</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="page auth-page">
      <h1>Criar conta</h1>
      {error && <p className="status-msg error">{error}</p>}
      <form className="creature-form" onSubmit={handleSubmit}>
        <label className="full">
          Usuário
          <input
            required
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            placeholder="3-20 caracteres, letras/números/_"
          />
        </label>
        <label className="full">
          E-mail
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </label>
        <label>
          Senha
          <input
            required
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            minLength={6}
          />
        </label>
        <label>
          Confirmar senha
          <input
            required
            type="password"
            value={form.confirm}
            onChange={(e) => update('confirm', e.target.value)}
            minLength={6}
          />
        </label>
        <div className="form-actions full">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Criando...' : 'Criar conta'}
          </button>
        </div>
      </form>
      <p className="hint">
        Já tem conta? <Link to="/entrar">Entrar</Link>
      </p>
    </div>
  );
}
