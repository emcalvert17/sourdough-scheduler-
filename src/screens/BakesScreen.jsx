import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { generateId } from '../utils/uuid.js';
import RecipeList from '../components/RecipeList.jsx';
import RecipeBuilder from '../components/RecipeBuilder.jsx';
import ScheduleSetup from '../components/ScheduleSetup.jsx';
import Timeline from '../components/Timeline.jsx';
import { getRecipes, saveRecipe, deleteRecipe } from '../utils/storage.js';
import { calculateSchedule } from '../utils/timeCalculator.js';
import { addBakeEntry } from '../utils/bakeLog.js';

function ShareRecipeModal({ recipe, userId, onClose }) {
  const [caption,    setCaption]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);

  const stepSummary = recipe.steps
    .map((s, i) => `${i + 1}. ${s.name || s.type} (${s.baseDuration >= 60 ? `${(s.baseDuration / 60).toFixed(1).replace(/\.0$/, '')}h` : `${s.baseDuration}m`})`)
    .join('\n');

  const handleShare = async () => {
    setSubmitting(true);
    const content = caption.trim()
      ? `${caption.trim()}\n\n${stepSummary}`
      : stepSummary;
    await supabase.from('posts').insert({
      id: generateId(),
      user_id: userId,
      type: 'bake',
      recipe_name: recipe.name,
      content,
    });
    setSubmitting(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎉</div>
            <h3>Recipe shared!</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>"{recipe.name}" is now on the community feed.</p>
          </div>
          <div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>Done</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Share "{recipe.name}"</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 14 }}>
          This will post your recipe steps to the community feed.
        </p>
        <div className="form-group">
          <label className="form-label">Caption <span className="form-optional">(optional)</span></label>
          <textarea className="form-input form-textarea" rows={3}
            placeholder="Share what makes this recipe special…"
            value={caption} onChange={e => setCaption(e.target.value)} />
        </div>
        <div className="card" style={{ background: 'var(--bg)', fontSize: '0.8rem', whiteSpace: 'pre-line', padding: 12, marginBottom: 16, color: 'var(--text-muted)' }}>
          {stepSummary}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleShare} disabled={submitting}>
            {submitting ? 'Sharing…' : 'Share Recipe'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BakesScreen({ active }) {
  const { user } = useAuth();

  const [view,               setView]               = useState('list');
  const [recipes,            setRecipes]            = useState(() => getRecipes());
  const [editingRecipe,      setEditingRecipe]      = useState(null);
  const [schedulingRecipe,   setSchedulingRecipe]   = useState(null);
  const [timeline,           setTimeline]           = useState(null);
  const [timelineCriteria,   setTimelineCriteria]   = useState(null);
  const [timelineConflicts,  setTimelineConflicts]  = useState([]);
  const [suggestedAdjust,    setSuggestedAdjust]    = useState(0);
  const [starterFeeds,       setStarterFeeds]       = useState([]);
  const [sharingRecipe,      setSharingRecipe]      = useState(null);

  const refreshRecipes = () => setRecipes(getRecipes());

  return (
    <div className="screen bakes-screen" style={{ display: active ? 'block' : 'none' }}>
      <div key={view} className="view-enter">
        {view === 'list' && (
          <div>
            <div className="screen-header">
              <span className="screen-title">Recipes</span>
            </div>
            <RecipeList
              recipes={recipes}
              onNew={() => { setEditingRecipe(null); setView('builder'); }}
              onEdit={r => { setEditingRecipe(r); setView('builder'); }}
              onDelete={id => { deleteRecipe(id); refreshRecipes(); }}
              onUse={r => { setSchedulingRecipe(r); setView('schedule'); }}
              onShare={r => setSharingRecipe(r)}
            />
          </div>
        )}

        {view === 'builder' && (
          <RecipeBuilder
            recipe={editingRecipe}
            onSave={r => { saveRecipe(r); refreshRecipes(); setView('list'); }}
            onCancel={() => setView('list')}
          />
        )}

        {view === 'schedule' && schedulingRecipe && (
          <ScheduleSetup
            recipe={schedulingRecipe}
            onCalculate={(eatTime, criteria, feeds) => {
              const { timeline, conflicts, suggestedAdjustMinutes } =
                calculateSchedule(schedulingRecipe, eatTime, criteria);
              setTimeline(timeline);
              setTimelineCriteria(criteria);
              setTimelineConflicts(conflicts);
              setSuggestedAdjust(suggestedAdjustMinutes);
              setStarterFeeds(feeds);
              setView('timeline');
            }}
            onBack={() => setView('list')}
          />
        )}

        {view === 'timeline' && timeline && (
          <Timeline
            recipe={schedulingRecipe}
            timeline={timeline}
            criteria={timelineCriteria}
            conflicts={timelineConflicts}
            suggestedAdjustMinutes={suggestedAdjust}
            starterFeeds={starterFeeds}
            userId={user?.id}
            onBack={() => setView('schedule')}
            onBackToList={() => {
              addBakeEntry({
                date: new Date().toISOString().slice(0, 10),
                recipeName: schedulingRecipe.name,
                recipeId: schedulingRecipe.id,
              });
              setView('list');
            }}
          />
        )}
      </div>

      {sharingRecipe && (
        <ShareRecipeModal
          recipe={sharingRecipe}
          userId={user?.id}
          onClose={() => setSharingRecipe(null)}
        />
      )}
    </div>
  );
}
