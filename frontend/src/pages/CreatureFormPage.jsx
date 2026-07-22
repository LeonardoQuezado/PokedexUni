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
  wildFleeChance: '',
  hp: 50,
  attack: 50,
  defense: 50,
  spAttack: 50,
  spDefense: 50,
  speed: 50,
};

function emptyAttack() {
  return {
    name: '',
    type: '',
    category: 'fisico',
    power: 50,
    accuracy: 100,
    effectKind: '',
    effectValues: {},
    requiresSelfStatus: false,
  };
}

const EFFECT_FIELDS = {
  lowerDefense: [{ key: 'amount', label: 'Redução de defesa do inimigo (%)' }],
  coinFlip: [{ key: 'selfDamagePercent', label: 'Dano a si mesmo se hesitar (%)' }],
  applyStatus: [{ key: 'selfSpeedBoost', label: 'Ganho de velocidade próprio (%)' }],
  requiresStatus: [{ key: 'selfSpeedPenalty', label: 'Perda de velocidade própria (%)' }],
  critChance: [
    { key: 'chance', label: 'Chance de crítico (%)' },
    { key: 'selfScareFleeBoost', label: 'Aumento na chance de fugir após crítico (%)' },
  ],
  stackingBuff: [{ key: 'statBoostPerStack', label: 'Ganho de ataque por uso (%)' }],
  resetStacksHeal: [],
  tauntStatus: [],
  selfHeal: [{ key: 'healPercent', label: 'Cura (% do PS máximo)' }],
  lowerAccuracy: [{ key: 'amount', label: 'Redução de precisão do inimigo (%)' }],
  selfBuffGate: [
    { key: 'speedBoost', label: 'Ganho de velocidade (%)' },
    { key: 'defenseBoost', label: 'Ganho de defesa (%)' },
  ],
  invulnerable: [],
  chanceConfuse: [{ key: 'chance', label: 'Chance de confundir o inimigo (%)' }],
  escalatingPerUse: [
    { key: 'power1', label: 'Poder no 1º uso' },
    { key: 'power2', label: 'Poder no 2º uso' },
    { key: 'power3', label: 'Poder no 3º uso' },
  ],
};

const EFFECT_KIND_LABELS = {
  lowerDefense: 'Reduz defesa do inimigo',
  coinFlip: 'Risco: acerta si mesmo ou o inimigo',
  applyStatus: 'Aplica status no inimigo + ganha velocidade',
  requiresStatus: 'Finalizador: requer status no inimigo, crítico garantido',
  critChance: 'Chance de crítico (fica assustado se acertar)',
  stackingBuff: 'Ganha ataque a cada uso (acumulativo)',
  resetStacksHeal: 'Remove o ataque acumulado e cura tudo',
  tauntStatus: 'Provoca: inimigo só usa ataque fraco no próximo turno',
  selfHeal: 'Cura a si mesmo',
  lowerAccuracy: 'Reduz a precisão do inimigo',
  selfBuffGate: 'Aumenta velocidade e defesa própria (libera ataques com pré-requisito)',
  invulnerable: 'Fica invulnerável por 1 turno',
  chanceConfuse: 'Chance de confundir o inimigo',
  escalatingPerUse: 'Sempre acerta; poder aumenta a cada uso (3 usos)',
};

function buildEffect(a) {
  if (!a.effectKind) return undefined;
  const fields = EFFECT_FIELDS[a.effectKind] || [];
  const values = a.effectValues || {};

  let effect;
  if (a.effectKind === 'escalatingPerUse') {
    const powers = fields.map((f) => {
      const n = Number(values[f.key]);
      return Number.isFinite(n) && n > 0 ? Math.min(150, Math.round(n)) : undefined;
    });
    if (powers.some((p) => p === undefined)) return undefined;
    effect = { kind: 'escalatingPerUse', powers };
  } else {
    effect = { kind: a.effectKind };
    for (const f of fields) {
      const pct = Number(values[f.key]);
      if (!Number.isFinite(pct)) return undefined;
      effect[f.key] = Math.min(90, Math.max(1, pct)) / 100;
    }
  }

  if (a.requiresSelfStatus) effect.requiresSelfStatus = 'estudando';
  return effect;
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
          attacks: (c.attacks || []).map((a) => {
            const kind = a.effect?.kind || '';
            const fields = EFFECT_FIELDS[kind] || [];
            const effectValues = {};
            if (kind === 'escalatingPerUse') {
              const powers = a.effect?.powers || [];
              fields.forEach((f, idx) => {
                if (powers[idx] != null) effectValues[f.key] = powers[idx];
              });
            } else {
              fields.forEach((f) => {
                const raw = a.effect?.[f.key];
                if (raw != null) effectValues[f.key] = Math.round(raw * 100);
              });
            }
            return {
              id: a.id,
              name: a.name,
              type: a.type || '',
              category: a.category === 'especial' ? 'especial' : 'fisico',
              power: a.power,
              accuracy: a.accuracy,
              effectKind: kind,
              effectValues,
              requiresSelfStatus: !!a.effect?.requiresSelfStatus,
            };
          }),
          evolvesToId: c.evolvesToId != null ? String(c.evolvesToId) : '',
          wildFleeChance: c.wildFleeChance ? Math.round(c.wildFleeChance * 100) : '',
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

  function updateAttackEffectKind(index, kind) {
    setForm((f) => {
      const attacks = [...f.attacks];
      attacks[index] = { ...attacks[index], effectKind: kind, effectValues: {} };
      return { ...f, attacks };
    });
  }

  function updateAttackEffectValue(index, key, value) {
    setForm((f) => {
      const attacks = [...f.attacks];
      attacks[index] = {
        ...attacks[index],
        effectValues: { ...attacks[index].effectValues, [key]: value },
      };
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
          ...(buildEffect(a) ? { effect: buildEffect(a) } : {}),
        })),
      evolvesToId: form.evolvesToId !== '' ? Number(form.evolvesToId) : null,
      wildFleeChance: form.wildFleeChance !== '' ? Number(form.wildFleeChance) / 100 : 0,
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
        <label>
          Chance de fugir quando selvagem (%, opcional)
          <input
            type="number"
            min="0"
            max="90"
            placeholder="0"
            value={form.wildFleeChance}
            onChange={(e) => update('wildFleeChance', e.target.value)}
          />
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
            <div className="attack-editor-card" key={i}>
              <div className="attack-editor-row">
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
              <div className="attack-effect-row">
                <select value={a.effectKind} onChange={(e) => updateAttackEffectKind(i, e.target.value)}>
                  <option value="">Sem efeito especial</option>
                  {Object.entries(EFFECT_KIND_LABELS).map(([kind, label]) => (
                    <option key={kind} value={kind}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {a.effectKind &&
                EFFECT_FIELDS[a.effectKind].map((f) => (
                  <div className="attack-effect-row" key={f.key}>
                    <input
                      type="number"
                      min="1"
                      max={a.effectKind === 'escalatingPerUse' ? 150 : 90}
                      placeholder={a.effectKind === 'escalatingPerUse' ? 'Poder' : '%'}
                      value={a.effectValues?.[f.key] ?? ''}
                      onChange={(e) => updateAttackEffectValue(i, f.key, e.target.value)}
                    />
                    <span className="hint attack-effect-hint">{f.label}</span>
                  </div>
                ))}
              {a.effectKind && (
                <label className="checkbox-label attack-effect-row">
                  <input
                    type="checkbox"
                    checked={a.requiresSelfStatus}
                    onChange={(e) => updateAttack(i, 'requiresSelfStatus', e.target.checked)}
                  />
                  Só pode ser usado após um autobuff (ex.: Estudo Acessível)
                </label>
              )}
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
