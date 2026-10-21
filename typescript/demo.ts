/** Synthetic educational retrieval; not a diagnostic system. Node.js >= 22.18. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type Disease = { label: string; parent: string; symptoms: string[] };
type Knowledge = {
  symptoms: Record<string, string[]>;
  diseases: Record<string, Disease>;
  ambiguous: Record<string, string[]>;
};
export const normalize = (text: string): string =>
  text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = (term: string): RegExp =>
  new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegex(normalize(term))}(?![\\p{L}\\p{N}_])`, 'gu');

export function retrieve(description: string, data: Knowledge) {
  const text = normalize(description);
  const positive = new Set<string>();
  const negative = new Set<string>();
  for (const [concept, terms] of Object.entries(data.symptoms)) {
    for (const term of terms) {
      for (const match of text.matchAll(pattern(term))) {
        const prefix = text.slice(0, match.index).split(/[.,;:!?\n]|\b(?:pero|aunque)\b/).at(-1)!;
        (/\b(?:sin|no|niego)\b/.test(prefix) ? negative : positive).add(concept);
      }
    }
  }
  const ambiguous = Object.fromEntries(Object.entries(data.ambiguous)
    .filter(([term]) => pattern(term).test(text)));
  const candidates = Object.entries(data.diseases).flatMap(([id, disease]) => {
    const matched = disease.symptoms.filter(s => positive.has(s)).sort();
    const conflicts = disease.symptoms.filter(s => negative.has(s)).sort();
    return matched.length ? [{ id, label: disease.label, score: matched.length - 2 * conflicts.length,
      matched, conflicts, unmentioned: disease.symptoms.filter(s => !positive.has(s) && !negative.has(s)).sort() }] : [];
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { positive: [...positive].sort(), negative: [...negative].sort(), ambiguous, candidates };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data: Knowledge = JSON.parse(readFileSync(new URL('../data/knowledge.json', import.meta.url), 'utf8'));
  console.log('EJEMPLO SINTÉTICO: candidatos, no diagnóstico ni probabilidades');
  console.log(JSON.stringify(retrieve(process.argv.slice(2).join(' ') || 'Tengo fiebre, tos y dolor de garganta', data), null, 2));
}
