// Q10 approximation: fermentation ~2x slower per 17°F cooler than 75°F baseline
export function getTempMultiplier(tempF) {
  return Math.pow(2, (75 - tempF) / 17);
}

export const ACTIVITY_MULTIPLIERS = {
  very_active: 0.8,
  active: 1.0,
  somewhat_active: 1.3,
  sluggish: 1.6,
};

export function calculateSchedule(recipe, eatTime, { tempF, activity, proofType, coldRetardHours }) {
  const tempMult = getTempMultiplier(tempF);
  const actMult = ACTIVITY_MULTIPLIERS[activity] ?? 1.0;

  const adjustedSteps = recipe.steps.map(step => {
    let adjusted = step.baseDuration;

    switch (step.type) {
      case 'fermentation':
        adjusted = Math.round(step.baseDuration * tempMult * actMult);
        break;
      case 'bulk_ferment':
        adjusted = Math.round(step.baseDuration * tempMult);
        break;
      case 'proof':
        if (proofType === 'cold_retard') {
          adjusted = Math.round((coldRetardHours ?? 12) * 60);
        } else {
          adjusted = Math.round(step.baseDuration * tempMult);
        }
        break;
      // manual, bake, rest: fixed duration
    }

    return { ...step, adjustedDuration: adjusted };
  });

  // Work backwards from eat time
  let cursor = eatTime.getTime();
  const timeline = [];

  for (let i = adjustedSteps.length - 1; i >= 0; i--) {
    const step = adjustedSteps[i];
    const endMs = cursor;
    const startMs = cursor - step.adjustedDuration * 60_000;

    const entry = {
      ...step,
      startTime: new Date(startMs),
      endTime: new Date(endMs),
    };

    // Inject stretch & fold events into bulk ferment
    if (step.type === 'bulk_ferment' && recipe.stretchAndFolds?.count > 0) {
      const { count, interval } = recipe.stretchAndFolds;
      entry.sfEvents = Array.from({ length: count }, (_, i) => ({
        label: `Stretch & Fold ${i + 1}`,
        time: new Date(startMs + (i + 1) * interval * 60_000),
      }));
    }

    timeline.unshift(entry);
    cursor = startMs;
  }

  return timeline;
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const timeStr = formatTime(date);
  if (date.toDateString() === today.toDateString()) return `Today ${timeStr}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow ${timeStr}`;
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ` ${timeStr}`;
}
