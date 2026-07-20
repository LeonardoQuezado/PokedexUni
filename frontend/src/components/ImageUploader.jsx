import { useState } from 'react';
import { uploadCreatureImage } from '../api';

export default function ImageUploader({ creatureId, onUploaded }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await uploadCreatureImage(creatureId, file);
      onUploaded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <div className="image-uploader">
      <label className="btn-upload">
        {busy ? 'Enviando...' : '📷 Adicionar / trocar foto'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFile}
          hidden
          disabled={busy}
        />
      </label>
      {error && <p className="status-msg error">{error}</p>}
    </div>
  );
}
