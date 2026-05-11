import { useState } from 'react';
import { getBakeLog, getBakeDays, deleteBakeEntry } from '../utils/bakeLog.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function buildCalendarDays(year, month) {
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMon; d++) cells.push(d);
  return cells;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const today   = new Date();
  const [year,  setYear]     = useState(today.getFullYear());
  const [month, setMonth]    = useState(today.getMonth());
  const [log,   setLog]      = useState(() => getBakeLog());
  const [selected, setSelected] = useState(null);

  const bakeDays  = getBakeDays();
  const cells     = buildCalendarDays(year, month);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else              { setMonth(m => m - 1); }
    setSelected(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else               { setMonth(m => m + 1); }
    setSelected(null);
  };

  const handleDelete = (id) => {
    deleteBakeEntry(id);
    setLog(getBakeLog());
    setSelected(null);
  };

  const selectedEntries = selected
    ? log.filter(e => e.date === selected)
    : [];

  return (
    <div className="screen calendar-screen">
      <div className="screen-header">
        <span className="screen-title">Calendar</span>
      </div>

      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
        <span className="cal-month-label">{MONTHS[month]} {year}</span>
        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
      </div>

      <div className="cal-grid">
        {WEEKDAYS.map(d => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateStr = toDateStr(year, month, day);
          const hasBake = bakeDays.has(dateStr);
          const isToday = dateStr === today.toISOString().slice(0, 10);
          const isSel   = dateStr === selected;
          return (
            <button
              key={dateStr}
              className={`cal-day${isToday ? ' today' : ''}${hasBake ? ' has-bake' : ''}${isSel ? ' selected' : ''}`}
              onClick={() => setSelected(isSel ? null : dateStr)}
            >
              <span>{day}</span>
              {hasBake && <div className="cal-dot" />}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="cal-detail">
          <div className="cal-detail-date">
            {new Date(selected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          {selectedEntries.length === 0 ? (
            <div className="cal-detail-empty">No bakes logged this day.</div>
          ) : (
            selectedEntries.map(entry => (
              <div key={entry.id} className="cal-entry">
                <div className="cal-entry-name">{entry.recipeName}</div>
                <button className="cal-entry-delete" onClick={() => handleDelete(entry.id)}>Remove</button>
              </div>
            ))
          )}
        </div>
      )}

      {log.length === 0 && !selected && (
        <div className="cal-empty">
          <p>No bakes logged yet. Complete a schedule in the Bakes tab to log your first bake.</p>
        </div>
      )}
    </div>
  );
}
