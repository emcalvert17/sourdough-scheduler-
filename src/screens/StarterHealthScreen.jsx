import { useState, useEffect } from 'react';

const HEALTH_KEY = 'ss_starter_health';

function getLogs() {
  try { return JSON.parse(localStorage.getItem(HEALTH_KEY)) || []; } catch { return []; }
}

function saveLogs(logs) {
  localStorage.setItem(HEALTH_KEY, JSON.stringify(logs));
}

const ACTIVITY_LEVELS = [
  { value: 1, label: 'Sluggish',    emoji: '😴', color: '#9a7860' },
  { value: 2, label: 'Slow',        emoji: '🐢', color: '#b87200' },
  { value: 3, label: 'Active',      emoji: '😊', color: '#5a8a6a' },
  { value: 4, label: 'Very Active', emoji: '🚀', color: '#2d6b4a' },
  { value: 5, label: 'Peak',        emoji: '🔥', color: '#c05a3a' },
];

function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MiniChart({ logs }) {
  const recent = [...logs].slice(-14);
  if (recent.length < 2) return null;

  const max = 5;
  const w = 300;
  const h = 64;
  const pad = 8;
  const ew = (w - pad * 2) / (recent.length - 1);

  const points = recent.map((l, i) => ({
    x: pad + i * ew,
    y: h - pad - ((l.activity / max) * (h - pad * 2)),
  }));

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${path} L${points[points.length-1].x},${h} L${points[0].x},${h} Z`;

  return (
    <div className="starter-chart">
      <div className="starter-chart-label">Activity over last {recent.length} feedings</div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--starter)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--starter)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#chartGrad)" />
        <path d={path} fill="none" stroke="var(--starter)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--starter)" />
        ))}
      </svg>
      <div className="starter-chart-axis">
        {['1','2','3','4','5'].map(n => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  );
}

export default function StarterHealthScreen() {
  const [logs,       setLogs]       = useState(() => getLogs());
  const [showForm,   setShowForm]   = useState(false);
  const [activity,   setActivity]   = useState(3);
  const [ratio,      setRatio]      = useState('1:1:1');
  const [tempF,      setTempF]      = useState(72);
  const [riseTime,   setRiseTime]   = useState('');
  const [notes,      setNotes]      = useState('');

  const avgActivity = logs.length
    ? (logs.slice(-7).reduce((s, l) => s + l.activity, 0) / Math.min(logs.length, 7)).toFixed(1)
    : '—';

  const lastFed = logs.length ? logs[logs.length - 1] : null;
  const hoursSince = lastFed
    ? Math.round((Date.now() - new Date(lastFed.fedAt).getTime()) / 3_600_000)
    : null;

  const handleLog = () => {
    const entry = {
      id: Date.now().toString(),
      fedAt: new Date().toISOString(),
      activity,
      ratio,
      tempF: parseFloat(tempF) || 72,
      riseTime: riseTime.trim() || null,
      notes: notes.trim() || null,
    };
    const updated = [...logs, entry];
    saveLogs(updated);
    setLogs(updated);
    setShowForm(false);
    setActivity(3);
    setRatio('1:1:1');
    setRiseTime('');
    setNotes('');
  };

  const handleDelete = (id) => {
    const updated = logs.filter(l => l.id !== id);
    saveLogs(updated);
    setLogs(updated);
  };

  return (
    <div className="screen starter-health-screen">
      <div className="screen-header">
        <span className="screen-title">Starter Health</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Log Feeding</button>
      </div>

      {/* Summary */}
      <div className="starter-summary-row">
        <div className="starter-summary-card">
          <div className="starter-summary-value">{avgActivity}</div>
          <div className="starter-summary-label">Avg activity (7 days)</div>
        </div>
        <div className="starter-summary-card">
          <div className="starter-summary-value">{logs.length}</div>
          <div className="starter-summary-label">Total feedings</div>
        </div>
        <div className="starter-summary-card">
          <div className="starter-summary-value">{hoursSince !== null ? `${hoursSince}h` : '—'}</div>
          <div className="starter-summary-label">Since last feed</div>
        </div>
      </div>

      {logs.length >= 2 && <MiniChart logs={logs} />}

      {/* Log form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>Log a Feeding</div>

          <div className="form-group">
            <label className="form-label">Activity level</label>
            <div className="activity-picker">
              {ACTIVITY_LEVELS.map(a => (
                <button
                  key={a.value}
                  className={`activity-btn${activity === a.value ? ' active' : ''}`}
                  style={{ '--activity-color': a.color }}
                  onClick={() => setActivity(a.value)}
                >
                  <span className="activity-emoji">{a.emoji}</span>
                  <span className="activity-label">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Ratio (starter:flour:water)</label>
              <select className="form-select" value={ratio} onChange={e => setRatio(e.target.value)}>
                {['1:1:1','1:2:2','1:3:3','1:5:5','1:10:10'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Kitchen temp (°F)</label>
              <input className="form-input" type="number" value={tempF}
                onChange={e => setTempF(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Rise time to peak <span className="form-optional">(optional)</span></label>
            <input className="form-input" placeholder="e.g. 4h 30m"
              value={riseTime} onChange={e => setRiseTime(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Notes <span className="form-optional">(optional)</span></label>
            <input className="form-input" placeholder="Smell, texture, any observations…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="builder-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleLog}>Save Entry</button>
          </div>
        </div>
      )}

      {/* History */}
      {logs.length === 0 ? (
        <div className="feed-empty">
          <div className="feed-empty-icon">🦠</div>
          <div className="feed-empty-title">No feedings logged yet</div>
          <div className="feed-empty-sub">Track your starter's health over time — activity, rise times, and notes.</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>
            Log your first feeding
          </button>
        </div>
      ) : (
        <div className="starter-log-list">
          <div className="section-title" style={{ marginBottom: 12 }}>Feeding History</div>
          {[...logs].reverse().map(entry => {
            const level = ACTIVITY_LEVELS.find(a => a.value === entry.activity);
            return (
              <div key={entry.id} className="starter-log-row">
                <div className="starter-log-activity" style={{ background: level?.color + '22', color: level?.color }}>
                  {level?.emoji} {level?.label}
                </div>
                <div className="starter-log-details">
                  <div className="starter-log-date">{formatDate(entry.fedAt)} at {formatTime(entry.fedAt)}</div>
                  <div className="starter-log-meta">
                    {entry.ratio} ratio · {entry.tempF}°F
                    {entry.riseTime && ` · peaked in ${entry.riseTime}`}
                  </div>
                  {entry.notes && <div className="starter-log-notes">{entry.notes}</div>}
                </div>
                <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(entry.id)}
                  style={{ color: 'var(--text-muted)', flexShrink: 0 }}>×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
