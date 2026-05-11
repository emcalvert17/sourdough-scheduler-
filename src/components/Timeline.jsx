import { TYPE_COLOR, TYPE_LABEL } from './RecipeBuilder.jsx';
import { formatDuration, formatDateTime, formatTime } from '../utils/timeCalculator';

const ACTIVITY_LABELS = {
  very_active:    'Very Active Starter',
  active:         'Active Starter',
  somewhat_active: 'Somewhat Active Starter',
  sluggish:       'Sluggish Starter',
};

const STARTER_COLOR = '#2d6b4a';

function TimelineRow({ time, dotColor, children, index = 0 }) {
  return (
    <div className="timeline-step" style={{ '--i': index }}>
      <div className="timeline-left">
        <div className="timeline-time">{formatTime(time)}</div>
      </div>
      <div className="timeline-connector">
        <div
          className="timeline-dot"
          style={{ background: dotColor, boxShadow: `0 0 0 4px ${dotColor}28` }}
        />
        <div className="timeline-line" />
      </div>
      <div className="timeline-right">
        {children}
      </div>
    </div>
  );
}

function formatHour(h) {
  if (h === 0)  return '12 AM';
  if (h < 12)   return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export default function Timeline({ recipe, timeline, criteria, conflicts, suggestedAdjustMinutes, starterFeeds, onBack, onBackToList }) {
  const { tempF, activity, proofType, coldRetardHours, activeHours } = criteria;
  const tempC = Math.round((tempF - 32) * 5 / 9);

  const eatTime       = timeline[timeline.length - 1]?.endTime;
  const totalMinutes  = timeline.reduce((sum, s) => sum + s.adjustedDuration, 0);
  const hasStarter    = starterFeeds?.length > 0;
  const firstEvent    = hasStarter ? starterFeeds[0].feedTime : timeline[0]?.startTime;

  // Unified index for stagger animation across both sections
  let globalIdx = 0;

  return (
    <div>
      <div className="back-nav" onClick={onBack}>← Adjust criteria</div>

      <div className="timeline-header">
        <h2>{recipe.name}</h2>
        <div className="timeline-meta">Baking time: {formatDuration(totalMinutes)}</div>
        <div className="criteria-chips">
          <span className="criteria-chip">{Math.round(tempF)}&deg;F / {tempC}&deg;C</span>
          <span className="criteria-chip">{ACTIVITY_LABELS[activity]}</span>
          <span className="criteria-chip">
            {proofType === 'cold_retard' ? `Cold retard ${coldRetardHours}h` : 'Room temp proof'}
          </span>
        </div>
      </div>

      <div className="start-card">
        <div className="start-card-label">{hasStarter ? 'First starter feed' : 'Start baking at'}</div>
        <div className="start-card-time">{formatDateTime(firstEvent)}</div>
        <div className="start-card-sub">to eat at {formatDateTime(eatTime)}</div>
      </div>

      {conflicts?.length > 0 && (
        <div className="conflict-banner">
          <div className="conflict-banner-icon">⚠️</div>
          <div className="conflict-banner-body">
            <strong>{conflicts.length} step{conflicts.length !== 1 ? 's' : ''} fall outside your active hours</strong>
            {activeHours && (
              <span className="conflict-hours"> ({formatHour(activeHours.from)}–{formatHour(activeHours.to)})</span>
            )}
            {suggestedAdjustMinutes !== 0 && (
              <div className="conflict-fix">
                Try {suggestedAdjustMinutes > 0 ? 'moving your eat time' : 'moving your eat time'}{' '}
                <strong>{formatDuration(Math.abs(suggestedAdjustMinutes))} {suggestedAdjustMinutes > 0 ? 'later' : 'earlier'}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {hasStarter && (
        <>
          <div className="timeline-section-label">Starter Preparation</div>
          <div className="timeline">
            {starterFeeds.map(feed => (
              <TimelineRow key={`feed-${feed.feedNumber}`} time={feed.feedTime} dotColor={STARTER_COLOR} index={globalIdx++}>
                <div className="timeline-content" style={{ borderLeftColor: STARTER_COLOR }}>
                  <div className="timeline-content-header">
                    <h4>Feed {feed.feedNumber}{feed.isLastFeed ? ' — Final Build' : ''}</h4>
                    <span className="tag" style={{ background: '#e0f0e8', color: STARTER_COLOR }}>Starter</span>
                  </div>
                  <div className="starter-feed-amounts">
                    {feed.discardGrams !== null
                      ? <div>Discard {feed.discardGrams}g &mdash; keep {feed.keepGrams}g</div>
                      : <div>Keep {feed.keepGrams}g, discard the rest</div>}
                    <div>Add {feed.flourGrams}g flour + {feed.waterGrams}g water &rarr; {feed.totalAfter}g total</div>
                  </div>
                  <div className="starter-peak">
                    {feed.isLastFeed ? 'Ready to use at' : 'Peaks at'}: {formatTime(feed.peakTime)}
                    {feed.isLastFeed && <span className="ready-badge">start baking</span>}
                  </div>
                </div>
              </TimelineRow>
            ))}
          </div>
          <div className="timeline-section-label">Baking</div>
        </>
      )}

      <div className="timeline">
        {timeline.map(step => (
          <TimelineRow key={step.id} time={step.startTime} dotColor={TYPE_COLOR[step.type] || '#888'} index={globalIdx++}>
            <div className="timeline-content" style={{ borderLeftColor: TYPE_COLOR[step.type] || '#888' }}>
              <div className="timeline-content-header">
                <h4>{step.name || TYPE_LABEL[step.type]}</h4>
                <span className="tag" style={{
                  background: (TYPE_COLOR[step.type] || '#888') + '22',
                  color: TYPE_COLOR[step.type] || '#888',
                }}>
                  {TYPE_LABEL[step.type]}
                </span>
              </div>
              <div className="timeline-duration">
                {formatDuration(step.adjustedDuration)}
                {step.baseDuration !== step.adjustedDuration && (
                  <span className="adjusted-note">(base {formatDuration(step.baseDuration)}, adjusted)</span>
                )}
              </div>
              {step.outOfWindow && (
                <div className="step-warning">
                  ⚠ Outside active hours
                </div>
              )}
              {step.notes && <div className="timeline-notes">{step.notes}</div>}
              {step.sfEvents?.map((sf, i) => (
                <div key={i} className={`sf-event${sf.outOfWindow ? ' sf-event--warn' : ''}`}>
                  <span className="sf-time">{formatTime(sf.time)}</span>
                  <span>{sf.label}</span>
                  {sf.outOfWindow && <span className="sf-warn-icon">⚠</span>}
                </div>
              ))}
            </div>
          </TimelineRow>
        ))}

        {/* Eat row — no line after it */}
        <div className="timeline-step" style={{ '--i': globalIdx }}>
          <div className="timeline-left">
            <div className="timeline-time eat-time">{formatTime(eatTime)}</div>
          </div>
          <div className="timeline-connector">
            <div className="timeline-dot eat-dot"
              style={{ boxShadow: `0 0 0 5px var(--primary-glow)` }} />
          </div>
          <div className="timeline-right">
            <div className="timeline-content eat-content">
              <h4>Eat</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="timeline-actions">
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onBackToList}>
          Back to Recipes
        </button>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => window.print()}>
          Print Schedule
        </button>
      </div>
    </div>
  );
}
