const KEY = 'sourdough_recipes';

export function getRecipes() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function saveRecipe(recipe) {
  const recipes = getRecipes();
  const idx = recipes.findIndex(r => r.id === recipe.id);
  if (idx >= 0) recipes[idx] = recipe;
  else recipes.push(recipe);
  localStorage.setItem(KEY, JSON.stringify(recipes));
}

export function deleteRecipe(id) {
  localStorage.setItem(KEY, JSON.stringify(getRecipes().filter(r => r.id !== id)));
}
