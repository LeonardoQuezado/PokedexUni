import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchCreature, createCreature, updateCreature } from '../api';

const emptyForm = {
  name: '',
  number: '',
  types: '',
  category: '',
  description: '',
  height: '',
  weight: '',
  genderless: false,
  abilities: '',
  weaknesses: '',
  attacks: '',
  hp: 50,
  attack: 50,
  defense: 50,
  spAttack: 50,
  spDefense: 50,
  speed: 50,
};

function toCsv(arr) {
  return (arr || []).join(', ');
}

function fromCsv(str) {
  return (str || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function CreatureFormPage() {
  const { idOrNumber } = useParams();
  const isEdit = !!idOrNumber;
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [creatureId, setCreatureId] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    fetchCreature(idOrNumber)
      .then((c) => {
        setCreatureId(c.id);
        setForm({
          name: c.name,
          number: c.number,
          types: toCsv(c.types),
          category: c.category || '',
          description: c.description || '',
          height: c.height ?? '',
          weight: c.weight ?? '',
          genderless: !!c.genderless,
          abilities: toCsv(c.abilities),
          weaknesses: toCsv(c.weaknesses),
          attacks: toCsv(c.attacks),
          hp: c.stats.hp,
          attack: c.stats.attack,
          defense: c.stats.defense,
          spAttack: c.stats.spAttack,
          spDefense: c.stats.spDefense,
          speed: c.stats.speed,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [idOrNumber, isEdit]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      number: form.number !== '' ? Number(form.number) : undefined,
      types: fromCsv(form.types),
      category: form.category,
      description: form.description,
      height: form.height !== '' ? Number(form.height) : null,
      weight: form.weight !== '' ? Number(form.weight) : null,
      genderless: form.genderless,
      abilities: fromCsv(form.abilities),
      weaknesses: fromCsv(form.weaknesses),
      attacks: fromCsv(form.attacks),
      stats: {
        hp: Number(form.hp),
        attack: Number(form.attack),
        defense: Number(form.defense),
        spAttack: Number(form.spAttack),
        spDefense: Number(form.spDefense),
        speed: Number(form.speed),
      },
    };
    try {
      const saved = isEdit ? await updateCreature(creatureId, payload) : await createCreature(payload);
      navigate(`/criatura/${saved.number}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="status-msg">Carregando...</p>;

  return (
    <div className="page form-page">
      <h1>{isEdit ? `Editar ${form.name}` : 'Nova criatura'}</h1>
      {error && <p className="status-msg error">{error}</p>}
      <form className="creature-form" onSubmit={handleSubmit}>
        <label>
          Nome
          <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
        </label>
        <label>
          Número (opcional, automático se vazio)
          <input type="number" value={form.number} onChange={(e) => update('number', e.target.value)} />
        </label>
        <label>
          Tipos (separados por vírgula)
          <input
            placeholder="Ex: Ogro, Dumb"
            value={form.types}
            onChange={(e) => update('types', e.target.value)}
          />
        </label>
        <label>
          Categoria
          <input value={form.category} onChange={(e) => update('category', e.target.value)} />
        </label>
        <label className="full">
          Descrição
          <textarea rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} />
        </label>
        <label>
          Altura (m)
          <input type="number" step="0.1" value={form.height} onChange={(e) => update('height', e.target.value)} />
        </label>
        <label>
          Peso (kg)
          <input type="number" step="0.1" value={form.weight} onChange={(e) => update('weight', e.target.value)} />
        </label>
        <label>
          Habilidades (separadas por vírgula)
          <input value={form.abilities} onChange={(e) => update('abilities', e.target.value)} />
        </label>
        <label>
          Fraquezas (separadas por vírgula)
          <input value={form.weaknesses} onChange={(e) => update('weaknesses', e.target.value)} />
        </label>
        <label className="full">
          Ataques (separados por vírgula)
          <input
            placeholder="Deixe em branco se ainda não tiver ataques definidos"
            value={form.attacks}
            onChange={(e) => update('attacks', e.target.value)}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.genderless}
            onChange={(e) => update('genderless', e.target.checked)}
          />
          Criatura sem gênero
        </label>

        <fieldset className="full">
          <legend>Estatísticas</legend>
          <div className="stats-grid">
            <label>
              PS
              <input type="number" value={form.hp} onChange={(e) => update('hp', e.target.value)} />
            </label>
            <label>
              Ataque
              <input type="number" value={form.attack} onChange={(e) => update('attack', e.target.value)} />
            </label>
            <label>
              Defesa
              <input type="number" value={form.defense} onChange={(e) => update('defense', e.target.value)} />
            </label>
            <label>
              Atq. Especial
              <input type="number" value={form.spAttack} onChange={(e) => update('spAttack', e.target.value)} />
            </label>
            <label>
              Def. Especial
              <input type="number" value={form.spDefense} onChange={(e) => update('spDefense', e.target.value)} />
            </label>
            <label>
              Velocidade
              <input type="number" value={form.speed} onChange={(e) => update('speed', e.target.value)} />
            </label>
          </div>
        </fieldset>

        <div className="form-actions full">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar criatura'}
          </button>
        </div>
      </form>
      {isEdit && (
        <p className="hint">Depois de salvar, você pode adicionar ou trocar a foto na página de detalhes.</p>
      )}
    </div>
  );
}
