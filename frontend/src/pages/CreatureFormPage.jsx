import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchCreature, fetchCreatures, createCreature, updateCreature } from '../api';

const MAX_ATTACKS = 4;

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
  attacks: [],
  evolvesToId: '',
  hp: 50,
  attack: 50,
  defense: 50,
  spAttack: 50,
  spDefense: 50,
  speed: 50,
};

function emptyAttack() {
  return { name: '', type: '', category: 'fisico', power: 50, accuracy: 100 };
}

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
  const [allCreatures, setAllCreatures] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCreatures().then(setAllCreatures).catch(() => {});
  }, []);

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
          attacks: (c.attacks || []).map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type || '',
            category: a.category === 'especial' ? 'especial' : 'fisico',
            power: a.power,
            accuracy: a.accuracy,
          })),
          evolvesToId: c.evolvesToId != null ? String(c.evolvesToId) : '',
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

  function updateAttack(index, field, value) {
    setForm((f) => {
      const attacks = [...f.attacks];
      attacks[index] = { ...attacks[index], [field]: value };
      return { ...f, attacks };
    });
  }

  function addAttack() {
    setForm((f) => (f.attacks.length >= MAX_ATTACKS ? f : { ...f, attacks: [...f.attacks, emptyAttack()] }));
  }

  function removeAttack(index) {
    setForm((f) => ({ ...f, attacks: f.attacks.filter((_, i) => i !== index) }));
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
      attacks: form.attacks
        .filter((a) => a.name && a.name.trim())
        .map((a) => ({
          ...(a.id != null ? { id: a.id } : {}),
          name: a.name.trim(),
          type: a.type ? a.type.trim() : null,
          category: a.category === 'especial' ? 'especial' : 'fisico',
          power: Number(a.power) || 50,
          accuracy: Number(a.accuracy) || 100,
        })),
      evolvesToId: form.evolvesToId !== '' ? Number(form.evolvesToId) : null,
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
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.genderless}
            onChange={(e) => update('genderless', e.target.checked)}
          />
          Criatura sem gênero
        </label>
        <label className="full">
          Evolui para
          <select value={form.evolvesToId} onChange={(e) => update('evolvesToId', e.target.value)}>
            <option value="">Nenhuma (não evolui)</option>
            {allCreatures
              .filter((c) => c.id !== creatureId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Nº {String(c.number).padStart(4, '0')})
                </option>
              ))}
          </select>
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

        <fieldset className="full">
          <legend>Ataques (máx. {MAX_ATTACKS})</legend>
          {form.attacks.length === 0 && <p className="muted">Nenhum ataque ainda.</p>}
          {form.attacks.map((a, i) => (
            <div className="attack-editor-row" key={i}>
              <input
                placeholder="Nome"
                value={a.name}
                onChange={(e) => updateAttack(i, 'name', e.target.value)}
              />
              <input
                placeholder="Tipo (opcional)"
                value={a.type}
                onChange={(e) => updateAttack(i, 'type', e.target.value)}
              />
              <select value={a.category} onChange={(e) => updateAttack(i, 'category', e.target.value)}>
                <option value="fisico">Físico</option>
                <option value="especial">Especial</option>
              </select>
              <input
                type="number"
                placeholder="Poder"
                value={a.power}
                onChange={(e) => updateAttack(i, 'power', e.target.value)}
              />
              <input
                type="number"
                placeholder="Precisão %"
                value={a.accuracy}
                onChange={(e) => updateAttack(i, 'accuracy', e.target.value)}
              />
              <button
                type="button"
                className="btn-danger btn-remove-attack"
                onClick={() => removeAttack(i)}
              >
                Remover
              </button>
            </div>
          ))}
          {form.attacks.length < MAX_ATTACKS && (
            <button type="button" className="btn-secondary" onClick={addAttack}>
              + Adicionar ataque
            </button>
          )}
          <p className="hint">Cada ataque pode ser usado 3 vezes por combate na Arena.</p>
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
