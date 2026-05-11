import { useState } from 'react';
import RecipeList from '../components/RecipeList.jsx';
import RecipeBuilder from '../components/RecipeBuilder.jsx';
import ScheduleSetup from '../components/ScheduleSetup.jsx';
import Timeline from '../components/Timeline.jsx';
import { getRecipes, saveRecipe, deleteRecipe } from '../utils/storage.js';
import { calculateSchedule } from '../utils/timeCalculator.js';
import { addBakeEntry } from '../utils/bakeLog.js';

export default function BakesScreen({ active }) {
  const [view,             setView]             = useState('list');
  const [recipes,          setRecipes]          = useState(() => getRecipes());
  const [editingRecipe,    setEditingRecipe]    = useState(null);
  const [schedulingRecipe, setSchedulingRecipe] = useState(null);
  const [timeline,              setTimeline]              = useState(null);
  const [timelineCriteria,      setTimelineCriteria]      = useState(null);
  const [timelineConflicts,     setTimelineConflicts]     = useState([]);
  const [suggestedAdjustMinutes, setSuggestedAdjustMinutes] = useState(0);
  const [starterFeeds,          setStarterFeeds]          = useState([]);

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
              setSuggestedAdjustMinutes(suggestedAdjustMinutes);
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
            suggestedAdjustMinutes={suggestedAdjustMinutes}
            starterFeeds={starterFeeds}
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
    </div>
  );
}
