import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { buyDayonballs } from '../api';

const DAYONBALL_PRICE = 20;

export default function ShopPage() {
  const { user, refresh } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const cost = quantity * DAYONBALL_PRICE;
  const canAfford = (user?.gold ?? 0) >= cost;

  async function handleBuy() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await buyDayonballs(quantity);
      await refresh();
      setSuccess(`Você comprou ${quantity} Dayonball(s) por ${cost}g!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!user) return <p className="status-msg">Carregando...</p>;

  return (
    <div className="page shop-page">
      <h1>Loja</h1>
      <p className="hint">Use seu ouro para comprar itens úteis nas suas aventuras.</p>

      <div className="info-box" style={{ marginBottom: 24 }}>
        <div>
          <span className="info-label">Seu ouro</span>
          <span className="info-value">💰 {user.gold ?? 0}g</span>
        </div>
        <div>
          <span className="info-label">Dayonballs</span>
          <span className="info-value">🔴 {user.dayonballs ?? 0}</span>
        </div>
      </div>

      {error && <p className="status-msg error">{error}</p>}
      {success && <p className="status-msg success">{success}</p>}

      <div className="shop-item-card">
        <div className="shop-item-icon">🔴</div>
        <div className="shop-item-info">
          <h2>Dayonball</h2>
          <p className="muted">Usada para tentar capturar Dayons selvagens na Aventura.</p>
          <span className="shop-item-price">20g cada</span>
        </div>
        <div className="shop-item-buy">
          <input
            type="number"
            min="1"
            max="99"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
          />
          <button type="button" className="btn-primary" disabled={busy || !canAfford} onClick={handleBuy}>
            {busy ? 'Comprando...' : `Comprar por ${cost}g`}
          </button>
          {!canAfford && <span className="hint">Ouro insuficiente</span>}
        </div>
      </div>
    </div>
  );
}
