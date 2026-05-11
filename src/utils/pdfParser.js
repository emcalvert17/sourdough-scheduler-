import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => item.str).join(' '));
  }
  return pages.join('\n\n');
}

const TYPE_KEYWORDS = {
  bulk_ferment: ['bulk ferment', 'bulk rise', 'bulk fermentation'],
  rest:         ['autolyse', 'autolyze', 'rest', 'soaker'],
  proof:        ['proof', 'proofing', 'final rise', 'retard', 'cold retard', 'overnight'],
  bake:         ['bake', 'baking', 'preheat', 'oven', 'dutch oven'],
  fermentation: ['levain', 'starter', 'poolish', 'pre-ferment', 'preferment'],
};

function detectType(text) {
  const lower = text.toLowerCase();
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return type;
  }
  return 'manual';
}

export function parseStepsFromText(text) {
  const timeRx = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)/i;
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 8 && l.length < 220);
  const steps = [];

  for (const line of lines) {
    const match = line.match(timeRx);
    if (!match) continue;

    const val = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    let baseDuration = unit.startsWith('h') ? Math.round(val * 60) : Math.round(val);
    baseDuration = Math.max(5, Math.min(baseDuration, 960));

    const name = line
      .replace(timeRx, '')
      .replace(/^\s*\d+[\.\)]\s*/, '')
      .replace(/[:\-–]+$/, '')
      .trim()
      .slice(0, 80) || 'Step';

    steps.push({
      id: crypto.randomUUID(),
      name,
      type: detectType(line),
      baseDuration,
      notes: '',
    });
  }

  return steps;
}
