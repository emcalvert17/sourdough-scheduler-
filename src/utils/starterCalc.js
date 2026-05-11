import { getTempMultiplier } from './timeCalculator.js';

// Base peak time at 75°F with 1:1:1 ratio: 7 hours
const BASE_PEAK_MINUTES = 420;

// Higher feed ratios = more food = longer time to peak
const RATIO_TIME_MULT = {
  '1:1:1': 1.0,
  '1:2:2': 1.35,
  '1:5:5': 1.75,
};

export const RATIO_OPTIONS = ['1:1:1', '1:2:2', '1:5:5'];

export function getPeakDuration(tempF, ratioKey) {
  const tempMult = getTempMultiplier(tempF);
  const ratioMult = RATIO_TIME_MULT[ratioKey] ?? 1.0;
  return Math.round(BASE_PEAK_MINUTES * tempMult * ratioMult);
}

export function calculateStarterFeeds({
  useTime,      // Date — when starter needs to be ready (= first recipe step)
  numFeeds,     // number — 1, 2, or 3
  keepGrams,    // number — grams to keep per feed
  ratioKey,     // string — '1:1:1', '1:2:2', '1:5:5'
  currentGrams, // number | null — current starter amount (for first discard)
  tempF,        // number — kitchen temperature in °F
  lastFedTime,  // Date | null — when starter was last fed
}) {
  const peakMinutes = getPeakDuration(tempF, ratioKey);
  const [sr, fr, wr] = ratioKey.split(':').map(Number);
  const flourGrams = Math.round(keepGrams * (fr / sr));
  const waterGrams = Math.round(keepGrams * (wr / sr));
  const totalAfter = keepGrams + flourGrams + waterGrams;

  // Work backwards from useTime — each feed peaks exactly when the next feed starts
  const feeds = [];
  let cursor = useTime.getTime();

  for (let i = numFeeds; i >= 1; i--) {
    const feedTime = new Date(cursor - peakMinutes * 60_000);
    const peakTime = new Date(cursor);
    // First feed discards from current jar; later feeds discard from prev total
    const prevAmount = i === 1 ? (currentGrams ?? null) : totalAfter;

    feeds.unshift({
      feedNumber: i,
      isLastFeed: i === numFeeds,
      feedTime,
      peakTime,
      keepGrams,
      prevAmount,
      discardGrams: prevAmount !== null ? Math.max(0, prevAmount - keepGrams) : null,
      flourGrams,
      waterGrams,
      totalAfter,
    });

    cursor = feedTime.getTime();
  }

  // Warn if first feed is too soon after last feed (need min 4h gap)
  let warning = null;
  if (lastFedTime && feeds.length > 0) {
    const gapMs = feeds[0].feedTime.getTime() - new Date(lastFedTime).getTime();
    const gapHours = gapMs / 3_600_000;
    if (gapHours < 4) {
      const sign = gapHours < 0 ? 'before' : 'after';
      warning = `Feed 1 is scheduled ${formatHours(Math.abs(gapHours))} ${sign} your last feed. Allow at least 4 hours between feeds.`;
    }
  }

  return { feeds, warning, peakMinutes };
}

function formatHours(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}
