import { useState, useMemo } from 'react';
import { getTempMultiplier, ACTIVITY_MULTIPLIERS, formatDuration } from '../utils/timeCalculator';
import { calculateStarterFeeds, getPeakDuration, RATIO_OPTIONS } from '../utils/starterCalc';
import { formatDateTime, formatTime } from '../utils/timeCalculator';

const ACTIVITY_OPTIONS = [
  { value: 'very_active',    label: 'Very Active',    desc: '2x volume, very bubbly, domed peak' },
  { value: 'active',         label: 'Active',         desc: 'Doubled, just past peak' },
  { value: 'somewhat_active', label: 'Somewhat Active', desc: 'Risen but not fully peaked' },
  { value: 'sluggish',       label: 'Sluggish',       desc: 'Slow rise, few bubbles' },
];

function defaultEatTime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(17, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function defaultLastFed() {
  const d = new Date();
  d.setHours(d.getHours() - 12, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function celsiusToF(c) { return c * 9 / 5 + 32; }
function fToCelsius(f) { return (f - 32) * 5 / 9; }

function pctLabel(mult) {
  if (mult > 1) return `+${Math.round((mult - 1) * 100)}% longer`;
  if (mult < 1) return `${Math.round((1 - mult) * 100)}% shorter`;
  return null;
}

export default function ScheduleSetup({ recipe, onCalculate, onBack }) {
  const [eatTime,     setEatTime]     = useState(defaultEatTime);
  const [tempUnit,    setTempUnit]    = useState('F');
  const [tempDisplay, setTempDisplay] = useState(72);
  const [activity,    setActivity]    = useState('active');
  const [proofType,   setProofType]   = useState('room_temp');
  const [coldHours,   setColdHours]   = useState(12);

  // Starter state
  const [includeStarter, setIncludeStarter] = useState(false);
  const [lastFed,        setLastFed]        = useState(defaultLastFed);
  const [currentGrams,   setCurrentGrams]   = useState(100);
  const [keepGrams,      setKeepGrams]      = useState(50);
  const [ratioKey,       setRatioKey]       = useState('1:2:2');
  const [numFeeds,       setNumFeeds]       = useState(2);

  const tempF = tempUnit === 'F' ? tempDisplay : celsiusToF(tempDisplay);
  const tempMult = getTempMultiplier(tempF);
  const actMult  = ACTIVITY_MULTIPLIERS[activity] ?? 1;

  const hasFermentation = recipe.steps.some(s => s.type === 'fermentation');
  const hasBulkFerment  = recipe.steps.some(s => s.type === 'bulk_ferment');
  const hasProof        = recipe.steps.some(s => s.type === 'proof');

  const toggleTempUnit = () => {
    if (tempUnit === 'F') {
      setTempDisplay(Math.round(fToCelsius(tempDisplay)));
      setTempUnit('C');
    } else {
      setTempDisplay(Math.round(celsiusToF(tempDisplay)));
      setTempUnit('F');
    }
  };

  // Calculate recipe start time (backwards from eat)
  const recipeStartTime = useMemo(() => {
    if (!eatTime) return null;
    const totalMin = recipe.steps.reduce((sum, step) => {
      let d = step.baseDuration;
      if (step.type === 'fermentation') d = Math.round(d * tempMult * actMult);
      else if (step.type === 'bulk_ferment') d = Math.round(d * tempMult);
      else if (step.type === 'proof') {
        d = proofType === 'cold_retard' ? Math.round(coldHours * 60) : Math.round(d * tempMult);
      }
      return sum + d;
    }, 0);
    return new Date(new Date(eatTime).getTime() - totalMin * 60_000);
  }, [eatTime, recipe, tempMult, actMult, proofType, coldHours]);

  // Starter feeds preview
  const starterCalc = useMemo(() => {
    if (!includeStarter || !recipeStartTime) return null;
    return calculateStarterFeeds({
      useTime: recipeStartTime,
      numFeeds,
      keepGrams,
      ratioKey,
      currentGrams,
      tempF,
      lastFedTime: lastFed ? new Date(lastFed) : null,
    });
  }, [includeStarter, recipeStartTime, numFeeds, keepGrams, ratioKey, currentGrams, tempF, lastFed]);

  const peakHours = includeStarter
    ? (getPeakDuration(tempF, ratioKey) / 60).toFixed(1).replace(/\.0$/, '')
    : null;

  const handleCalculate = () => {
    if (!eatTime) { alert('Please set your eat time.'); return; }
    onCalculate(
      new Date(eatTime),
      { tempF, activity, proofType, coldRetardHours: coldHours },
      includeStarter ? starterCalc?.feeds ?? [] : [],
    );
  };

  return (
    <div>
      <div className="back-nav" onClick={onBack}>← Back to recipes</div>
      <h2 style={{ marginBottom: 4 }}>{recipe.name}</h2>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 24 }}>
        {recipe.steps.length} steps — set your criteria for a precise schedule
      </div>

      {/* Eat time */}
      <div className="card">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">When do you want to eat?</label>
          <input
            className="form-input"
            type="datetime-local"
            value={eatTime}
            onChange={e => setEatTime(e.target.value)}
          />
        </div>
      </div>

      {/* Environment */}
      <div className="card">
        <div className="section-title">Environment</div>

        <div className="form-group">
          <label className="form-label">Kitchen Temperature</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              type="number"
              value={tempDisplay}
              onChange={e => setTempDisplay(parseFloat(e.target.value) || 70)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-secondary unit-toggle" onClick={toggleTempUnit}>
              &deg;{tempUnit}
            </button>
          </div>
          {pctLabel(tempMult) && (
            <div className="field-hint">
              {tempMult > 1 ? 'Cooler kitchen' : 'Warmer kitchen'} — fermentation ~{pctLabel(tempMult)} vs. 75&deg;F baseline
            </div>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Starter Activity</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ACTIVITY_OPTIONS.map(opt => (
              <label key={opt.value} className={`radio-card ${activity === opt.value ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="activity"
                  value={opt.value}
                  checked={activity === opt.value}
                  onChange={() => setActivity(opt.value)}
                  style={{ display: 'none' }}
                />
                <div className="radio-dot" style={{
                  borderColor: activity === opt.value ? 'var(--accent)' : 'var(--border)',
                  background:  activity === opt.value ? 'var(--accent)' : 'transparent',
                }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          {(hasFermentation || hasBulkFerment) && pctLabel(actMult) && (
            <div className="field-hint" style={{ marginTop: 10 }}>
              Fermentation steps {pctLabel(actMult)} for starter activity
            </div>
          )}
        </div>
      </div>

      {/* Final proof */}
      {hasProof && (
        <div className="card">
          <div className="section-title">Final Proof</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: proofType === 'cold_retard' ? 16 : 0 }}>
            {[
              { value: 'room_temp',   label: 'Room Temp' },
              { value: 'cold_retard', label: 'Cold Retard (fridge)' },
            ].map(opt => (
              <label key={opt.value} className={`proof-card ${proofType === opt.value ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="proofType"
                  value={opt.value}
                  checked={proofType === opt.value}
                  onChange={() => setProofType(opt.value)}
                  style={{ display: 'none' }}
                />
                {opt.label}
              </label>
            ))}
          </div>
          {proofType === 'cold_retard' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Hours in fridge</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="form-input"
                  type="number"
                  min="4"
                  max="36"
                  value={coldHours}
                  onChange={e => setColdHours(parseFloat(e.target.value) || 12)}
                  style={{ flex: 1 }}
                />
                <span className="unit-label">hours</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Starter feeding schedule */}
      <div className="card">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={includeStarter}
            onChange={e => setIncludeStarter(e.target.checked)}
            className="toggle-checkbox"
          />
          <div className={`toggle-switch ${includeStarter ? 'on' : ''}`} />
          <div>
            <div style={{ fontWeight: 600 }}>Include starter feeding schedule</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Calculate when to feed, discard, and how much flour &amp; water to add
            </div>
          </div>
        </label>

        {includeStarter && (
          <div className="starter-section">
            <div className="form-group">
              <label className="form-label">Last fed</label>
              <input
                className="form-input"
                type="datetime-local"
                value={lastFed}
                onChange={e => setLastFed(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Current amount</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    className="form-input"
                    type="number"
                    min="10"
                    value={currentGrams}
                    onChange={e => setCurrentGrams(parseInt(e.target.value) || 0)}
                  />
                  <span className="unit-label">g</span>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Keep per feed</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    className="form-input"
                    type="number"
                    min="10"
                    value={keepGrams}
                    onChange={e => setKeepGrams(parseInt(e.target.value) || 0)}
                  />
                  <span className="unit-label">g</span>
                </div>
              </div>
            </div>

            <div className="form-row" style={{ marginTop: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Feed ratio (starter:flour:water)</label>
                <select
                  className="form-select"
                  value={ratioKey}
                  onChange={e => setRatioKey(e.target.value)}
                >
                  {RATIO_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Feeds before use</label>
                <select
                  className="form-select"
                  value={numFeeds}
                  onChange={e => setNumFeeds(parseInt(e.target.value))}
                >
                  <option value={1}>1 feed</option>
                  <option value={2}>2 feeds</option>
                  <option value={3}>3 feeds</option>
                </select>
              </div>
            </div>

            {peakHours && (
              <div className="field-hint" style={{ marginTop: 12 }}>
                At {Math.round(tempF)}&deg;F with {ratioKey} ratio — each feed peaks in ~{peakHours}h
              </div>
            )}

            {/* Starter preview */}
            {starterCalc && (
              <div className="starter-preview">
                {starterCalc.warning && (
                  <div className="warning-note">{starterCalc.warning}</div>
                )}
                {starterCalc.feeds.map(feed => (
                  <div key={feed.feedNumber} className="starter-feed-preview">
                    <div className="sfp-header">
                      <span className="sfp-label">Feed {feed.feedNumber}{feed.isLastFeed ? ' — Final Build' : ''}</span>
                      <span className="sfp-time">{formatDateTime(feed.feedTime)}</span>
                    </div>
                    <div className="sfp-amounts">
                      {feed.discardGrams !== null
                        ? <span>Discard {feed.discardGrams}g (keep {feed.keepGrams}g)</span>
                        : <span>Keep {feed.keepGrams}g, discard the rest</span>
                      }
                      <span className="sfp-sep">·</span>
                      <span>Add {feed.flourGrams}g flour + {feed.waterGrams}g water</span>
                      <span className="sfp-sep">·</span>
                      <span>{feed.totalAfter}g total</span>
                    </div>
                    <div className="sfp-peak">
                      Peaks {feed.isLastFeed ? '(ready to use)' : ''}: {formatDateTime(feed.peakTime)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Adjustments note */}
      {(tempMult !== 1 || actMult !== 1 || proofType === 'cold_retard') && (
        <div className="adjustment-note">
          Adjustments active:
          {tempMult !== 1 && <span> temp x{tempMult.toFixed(2)}</span>}
          {(hasFermentation || hasBulkFerment) && actMult !== 1 && <span> · activity x{actMult.toFixed(2)}</span>}
          {proofType === 'cold_retard' && <span> · cold retard {coldHours}h</span>}
        </div>
      )}

      <button className="btn btn-primary btn-full btn-lg" onClick={handleCalculate}>
        Generate Schedule
      </button>
    </div>
  );
}
