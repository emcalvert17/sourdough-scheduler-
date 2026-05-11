import { generateId } from './uuid.js';

// Fetches a recipe page via CORS proxy, then parses structured data (schema.org)
// or falls back to text heuristics.

const PROXIES = [
  // Primary: our own Netlify function — fetches server-side with real browser headers
  async (url) => {
    const endpoint = `/.netlify/functions/fetch-recipe?url=${encodeURIComponent(url)}`;
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  },
  // Fallbacks for local dev where the Netlify function isn't running
  async (url) => {
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  },
  async (url) => {
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  },
];

export async function fetchRecipeFromUrl(url) {
  let lastError;
  for (const proxy of PROXIES) {
    try {
      return await proxy(url);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Could not fetch page — all proxies failed (${lastError?.message})`);
}

function detectType(text) {
  const lower = text.toLowerCase();
  const rules = [
    ['bulk_ferment', ['bulk ferment', 'bulk rise', 'bulk fermentation']],
    ['rest',         ['autolyse', 'autolyze', 'rest', 'soaker']],
    ['proof',        ['proof', 'proofing', 'final rise', 'retard', 'cold retard', 'overnight']],
    ['bake',         ['bake', 'baking', 'preheat', 'oven', 'dutch oven']],
    ['fermentation', ['levain', 'starter', 'poolish', 'pre-ferment', 'preferment']],
  ];
  for (const [type, kws] of rules) {
    if (kws.some(kw => lower.includes(kw))) return type;
  }
  return 'manual';
}

const timeRx = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)/i;

function parseDuration(text) {
  const m = text.match(timeRx);
  if (!m) return 30;
  const val = parseFloat(m[1]);
  return Math.max(5, Math.min(m[2].toLowerCase().startsWith('h') ? Math.round(val * 60) : Math.round(val), 960));
}

function stepsFromInstructions(instructions) {
  return instructions.flatMap(inst => {
    const text = typeof inst === 'string' ? inst : (inst.text || inst.name || '');
    const name = typeof inst === 'string' ? text : (inst.name || text);
    if (!text.trim()) return [];
    return [{
      id: generateId(),
      name: name.trim().slice(0, 80),
      type: detectType(text),
      baseDuration: parseDuration(text),
      notes: (inst.name && inst.text) ? inst.text.trim().slice(0, 200) : '',
    }];
  });
}

function findRecipeSchema(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data.map(findRecipeSchema).find(Boolean) ?? null;
  if (data['@graph']) return findRecipeSchema(data['@graph']);
  if ([].concat(data['@type'] || []).includes('Recipe')) return data;
  return null;
}

export function parseRecipeFromHtml(html) {
  // 1. Try JSON-LD structured data (works on King Arthur, NYT Cooking, Serious Eats, etc.)
  const ldMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ldMatches) {
    try {
      const schema = findRecipeSchema(JSON.parse(m[1]));
      if (schema?.recipeInstructions?.length) {
        return {
          recipeName: schema.name || '',
          steps: stepsFromInstructions(schema.recipeInstructions),
        };
      }
    } catch { /* malformed JSON-LD — skip */ }
  }

  // 2. Try extracting <li> items (most recipe sites use ordered lists for steps)
  const liMatches = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(t => t.length > 10 && t.length < 400);

  const sourdoughKws = ['mix', 'fold', 'ferment', 'proof', 'shape', 'score', 'bake', 'preheat',
    'rest', 'autolyse', 'autolyze', 'knead', 'stretch', 'bulk', 'levain', 'starter', 'retard',
    'oven', 'dutch', 'cover', 'flour', 'water', 'dough', 'loaf', 'minutes', 'hours'];

  const liSteps = liMatches
    .filter(t => sourdoughKws.some(kw => t.toLowerCase().includes(kw)))
    .map(line => ({
      id: generateId(),
      name: line.replace(timeRx, '').replace(/^\d+[\.\)]\s*/, '').replace(/[:\-–]+$/, '').trim().slice(0, 80) || 'Step',
      type: detectType(line),
      baseDuration: parseDuration(line),
      notes: '',
    }));

  if (liSteps.length >= 2) return { recipeName: '', steps: liSteps };

  // 3. Strip HTML and scan for sentences containing time references
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');

  const steps = text
    .split(/[.!?\n]/)
    .map(l => l.trim())
    .filter(l => l.length > 10 && l.length < 220 && timeRx.test(l))
    .map(line => ({
      id: generateId(),
      name: line.replace(timeRx, '').replace(/^\d+[\.\)]\s*/, '').replace(/[:\-–]+$/, '').trim().slice(0, 80) || 'Step',
      type: detectType(line),
      baseDuration: parseDuration(line),
      notes: '',
    }));

  return { recipeName: '', steps };
}
