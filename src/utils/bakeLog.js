import { generateId } from './uuid.js';

const BAKE_LOG_KEY = 'ss_bake_log';

export function getBakeLog() {
  try { return JSON.parse(localStorage.getItem(BAKE_LOG_KEY)) || []; } catch { return []; }
}

export function addBakeEntry(entry) {
  const log = getBakeLog();
  log.unshift({ ...entry, id: entry.id || generateId(), loggedAt: new Date().toISOString() });
  localStorage.setItem(BAKE_LOG_KEY, JSON.stringify(log));
}

export function deleteBakeEntry(id) {
  const log = getBakeLog().filter(e => e.id !== id);
  localStorage.setItem(BAKE_LOG_KEY, JSON.stringify(log));
}

// Returns a Set of 'YYYY-MM-DD' strings that have bake entries
export function getBakeDays() {
  return new Set(getBakeLog().map(e => e.date));
}

// Current bake streak (consecutive days ending today or yesterday)
export function getBakeStreak() {
  const days = [...getBakeDays()].sort().reverse();
  if (days.length === 0) return 0;

  const today    = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400_000));

  if (days[0] !== today && days[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = (prev - curr) / 86400_000;
    if (diff === 1) { streak++; } else { break; }
  }
  return streak;
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}
