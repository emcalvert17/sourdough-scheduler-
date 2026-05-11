import { useState } from 'react';

function StarRating({ value, onRate, readonly = false }) {
  const [hover, setHover] = useState(null);
  const display = hover ?? value ?? 0;
  return (
    <div className="star-rating">
      {[1,2,3,4,5].map(n => (
        <span
          key={n}
          className={`star${display >= n ? ' star--filled' : ''}`}
          onClick={readonly ? undefined : () => onRate(n === value ? 0 : n)}
          onMouseEnter={readonly ? undefined : () => setHover(n)}
          onMouseLeave={readonly ? undefined : () => setHover(null)}
          style={{ cursor: readonly ? 'default' : 'pointer' }}
        >★</span>
      ))}
      {!readonly && value > 0 && (
        <span className="star-clear" onClick={() => onRate(0)}>✕</span>
      )}
    </div>
  );
}

export default function RecipeList({ recipes, onNew, onEdit, onDelete, onUse, onShare, onRate }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = (id) => {
    if (confirmDelete === id) {
      onDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  return (
    <div>
      <div className="list-header">
        <h2 className="section-title" style={{ marginBottom: 0 }}>Your Recipes</h2>
        <button className="btn btn-primary" onClick={onNew}>+ New Recipe</button>
      </div>

      {recipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="6" y="18" width="36" height="24" rx="4" fill="#e5d8c8"/>
              <path d="M12 18C12 11.4 17.4 6 24 6C30.6 6 36 11.4 36 18" stroke="#7b4f2e" strokeWidth="2.5" strokeLinecap="round"/>
              <ellipse cx="24" cy="30" rx="8" ry="5" fill="#7b4f2e" opacity="0.15"/>
            </svg>
          </div>
          <h3>No recipes yet</h3>
          <p>Build your first sourdough recipe and get a precise baking schedule.</p>
          <button className="btn btn-primary" onClick={onNew}>Create Your First Recipe</button>
        </div>
      ) : (
        recipes.map(recipe => (
          <div key={recipe.id} className="card recipe-card">
            <div className="recipe-card-info">
              <h3>{recipe.name}</h3>
              <div className="meta">
                {recipe.steps.length} step{recipe.steps.length !== 1 ? 's' : ''}
                {recipe.stretchAndFolds?.count > 0 &&
                  ` · ${recipe.stretchAndFolds.count}x stretch & fold`}
              </div>
              {onRate && (
                <StarRating value={recipe.rating ?? 0} onRate={rating => onRate(recipe.id, rating)} />
              )}
            </div>
            <div className="recipe-card-actions">
              {confirmDelete === recipe.id ? (
                <>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(recipe.id)}>Confirm</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => onEdit(recipe)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(recipe.id)}>Delete</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => onShare(recipe)}>Share</button>
                  <button className="btn btn-primary btn-sm" onClick={() => onUse(recipe)}>Schedule</button>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
