import { useState } from 'react';
import { fetchRecipeFromUrl, parseRecipeFromHtml } from '../utils/urlParser.js';
import { generateId } from '../utils/uuid.js';

export const STEP_TYPES = [
  { value: 'rest',         label: 'Rest / Autolyse',  shortLabel: 'Rest',         desc: 'Passive rest — not temp sensitive', color: '#8a7a5a' },
  { value: 'fermentation', label: 'Levain / Ferment',  shortLabel: 'Levain',       desc: 'Levain build — temp & activity sensitive', color: '#5a8a6a' },
  { value: 'manual',       label: 'Manual Step',       shortLabel: 'Manual',       desc: 'Hands-on: mixing, shaping, scoring', color: '#b5803a' },
  { value: 'bulk_ferment', label: 'Bulk Ferment',      shortLabel: 'Bulk Ferment', desc: 'Bulk rise — temp sensitive, S&F injected here', color: '#4a7a8a' },
  { value: 'proof',        label: 'Final Proof',       shortLabel: 'Proof',        desc: 'Room temp or cold retard', color: '#8a6a9a' },
  { value: 'bake',         label: 'Bake / Preheat',    shortLabel: 'Bake',         desc: 'Oven time — fixed duration', color: '#c05a3a' },
];

export const TYPE_COLOR = Object.fromEntries(STEP_TYPES.map(t => [t.value, t.color]));
export const TYPE_LABEL = Object.fromEntries(STEP_TYPES.map(t => [t.value, t.label]));

function newStep() {
  return { id: generateId(), name: '', type: 'manual', baseDuration: 30, displayUnit: 'min', notes: '' };
}

function toMinutes(value, unit) {
  const n = parseFloat(value) || 0;
  return unit === 'hrs' ? Math.round(n * 60) : Math.round(n);
}

function fromMinutes(minutes, unit) {
  if (unit === 'hrs') {
    const v = minutes / 60;
    return v % 1 === 0 ? v : parseFloat(v.toFixed(1));
  }
  return minutes;
}

export default function RecipeBuilder({ recipe, onSave, onCancel }) {
  const [name,   setName]   = useState(recipe?.name || '');
  const [steps,  setSteps]  = useState(() =>
    recipe?.steps.map(s => ({ ...s, displayUnit: s.baseDuration >= 90 ? 'hrs' : 'min' })) || []
  );
  const [sfCount,    setSfCount]    = useState(recipe?.stretchAndFolds?.count    ?? 4);
  const [sfInterval, setSfInterval] = useState(recipe?.stretchAndFolds?.interval ?? 30);

  const [urlInput,    setUrlInput]    = useState('');
  const [fetching,    setFetching]    = useState(false);
  const [importModal, setImportModal] = useState(null);

  const hasBulkFerment = steps.some(s => s.type === 'bulk_ferment');

  const updateStep = (id, field, value) =>
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));

  const updateDuration = (id, value, unit) =>
    setSteps(prev => prev.map(s => s.id === id
      ? { ...s, baseDuration: toMinutes(value, unit), displayUnit: unit } : s));

  const switchUnit = (id, unit) =>
    setSteps(prev => prev.map(s => s.id === id ? { ...s, displayUnit: unit } : s));

  const moveStep = (idx, dir) => {
    setSteps(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleUrlFetch = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setFetching(true);
    try {
      const html = await fetchRecipeFromUrl(url);
      const { steps: parsed, recipeName } = parseRecipeFromHtml(html);
      if (!name && recipeName) setName(recipeName);
      setImportModal({ steps: parsed, recipeName });
    } catch (err) {
      alert(`Could not fetch recipe: ${err.message}`);
    } finally {
      setFetching(false);
    }
  };

  const updateImportStep = (id, field, value) =>
    setImportModal(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === id ? { ...s, [field]: value } : s),
    }));

  const confirmImport = () => {
    setSteps(prev => [
      ...prev,
      ...importModal.steps.map(({ ...s }) => ({
        ...s,
        displayUnit: s.baseDuration >= 90 ? 'hrs' : 'min',
      })),
    ]);
    setImportModal(null);
    setUrlInput('');
  };

  const handleSave = () => {
    if (!name.trim()) { alert('Please enter a recipe name.'); return; }
    if (steps.length === 0) { alert('Please add at least one step.'); return; }
    onSave({
      id: recipe?.id || generateId(),
      name: name.trim(),
      steps: steps.map(({ displayUnit, ...s }) => s),
      stretchAndFolds: hasBulkFerment
        ? { count: sfCount, interval: sfInterval }
        : { count: 0, interval: 0 },
      createdAt: recipe?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div>
      <div className="back-nav" onClick={onCancel}>← Back to recipes</div>
      <h2>{recipe ? 'Edit Recipe' : 'New Recipe'}</h2>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Recipe Name</label>
          <input
            className="form-input"
            placeholder="e.g. Country Sourdough"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
      </div>

      {/* URL import */}
      <div className="card url-import-card">
        <div className="form-label" style={{ marginBottom: 10 }}>Import from a recipe URL</div>
        <div className="url-import-row">
          <input
            className="form-input"
            type="url"
            placeholder="https://www.kingarthurbaking.com/recipes/..."
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUrlFetch()}
          />
          <button
            className="btn btn-secondary"
            onClick={handleUrlFetch}
            disabled={fetching || !urlInput.trim()}
          >
            {fetching ? <span className="fetch-spinner" /> : null}
            {fetching ? 'Fetching…' : 'Import'}
          </button>
        </div>
        <div className="field-hint">
          Works with most recipe sites that use structured data (King Arthur, Serious Eats, NYT Cooking, etc.)
        </div>
      </div>

      <div className="steps-header">
        <div className="section-title" style={{ marginBottom: 0 }}>Steps — in baking order</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setSteps(p => [...p, newStep()])}>
          + Add Step
        </button>
      </div>

      {steps.length === 0 && (
        <div className="card steps-empty">
          Import from a URL above, or add steps manually.
        </div>
      )}

      {steps.map((step, idx) => (
        <div key={step.id} className="step-card" style={{ '--i': idx }}>
          <div className="step-card-accent" style={{ background: TYPE_COLOR[step.type] }} />
          <div className="step-card-body">
            <div className="step-header">
              <div className="step-number">{idx + 1}</div>
              <span className="step-type-label">{TYPE_LABEL[step.type]}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                <button className="btn btn-icon btn-ghost" onClick={() => moveStep(idx, -1)} disabled={idx === 0}>↑</button>
                <button className="btn btn-icon btn-ghost" onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1}>↓</button>
                <button className="btn btn-icon btn-danger" onClick={() => setSteps(p => p.filter(s => s.id !== step.id))}>×</button>
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: 10 }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
                <label className="form-label">Step Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Bulk Fermentation"
                  value={step.name}
                  onChange={e => updateStep(step.id, 'name', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label className="form-label">Type</label>
                <select
                  className="form-select"
                  value={step.type}
                  onChange={e => updateStep(step.id, 'type', e.target.value)}
                >
                  {STEP_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.shortLabel}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Base Duration</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    style={{ flex: 1 }}
                    value={fromMinutes(step.baseDuration, step.displayUnit)}
                    onChange={e => updateDuration(step.id, e.target.value, step.displayUnit)}
                  />
                  <select
                    className="form-select"
                    style={{ flex: '0 0 68px' }}
                    value={step.displayUnit}
                    onChange={e => switchUnit(step.id, e.target.value)}
                  >
                    <option value="min">min</option>
                    <option value="hrs">hrs</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
                <label className="form-label">Notes (optional)</label>
                <input
                  className="form-input"
                  placeholder="Any special instructions…"
                  value={step.notes}
                  onChange={e => updateStep(step.id, 'notes', e.target.value)}
                />
              </div>
            </div>

            <div className="step-type-hint">
              {STEP_TYPES.find(t => t.value === step.type)?.desc}
            </div>
          </div>
        </div>
      ))}

      {hasBulkFerment && (
        <div className="card sf-card">
          <div className="section-title" style={{ marginBottom: 14 }}>Stretch & Fold — during Bulk Ferment</div>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Number of sets</label>
              <input className="form-input" type="number" min="0" max="8" value={sfCount}
                onChange={e => setSfCount(parseInt(e.target.value) || 0)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Interval between sets</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="form-input" type="number" min="15" value={sfInterval}
                  onChange={e => setSfInterval(parseInt(e.target.value) || 30)} />
                <span className="unit-label">min</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="builder-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>
          {recipe ? 'Save Changes' : 'Save Recipe'}
        </button>
      </div>

      {/* URL Import Modal */}
      {importModal && (
        <div className="modal-overlay" onClick={() => setImportModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{importModal.recipeName ? `"${importModal.recipeName}"` : 'Imported Steps'}</h3>
            <p className="modal-sub">
              {importModal.steps.length > 0
                ? `${importModal.steps.length} step${importModal.steps.length !== 1 ? 's' : ''} detected — edit before importing.`
                : 'No steps were auto-detected. Check the URL or add steps manually.'}
            </p>

            <div className="import-steps-list">
              {importModal.steps.map((step, idx) => (
                <div key={step.id} className="import-step-row" style={{ '--i': idx }}>
                  <span className="import-step-num">{idx + 1}</span>
                  <input className="form-input" style={{ flex: 3 }} value={step.name}
                    onChange={e => updateImportStep(step.id, 'name', e.target.value)} />
                  <select className="form-select" style={{ flex: 1 }} value={step.type}
                    onChange={e => updateImportStep(step.id, 'type', e.target.value)}>
                    {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.shortLabel}</option>)}
                  </select>
                  <input className="form-input" type="number" style={{ flex: 1, minWidth: 0 }}
                    value={step.baseDuration}
                    onChange={e => updateImportStep(step.id, 'baseDuration', parseInt(e.target.value) || 0)} />
                  <span className="unit-label" style={{ flexShrink: 0 }}>min</span>
                  <button className="btn btn-icon btn-danger"
                    onClick={() => setImportModal(p => ({ ...p, steps: p.steps.filter(s => s.id !== step.id) }))}>×</button>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setImportModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmImport} disabled={importModal.steps.length === 0}>
                Add {importModal.steps.length} step{importModal.steps.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
