import { isNegated } from '../../02-model/02-text/clinical-language.ts';
/** Browser-safe shared retrieval engine. No network or storage. */
type Disease = { parent: string; symptoms: string[] };
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

export function retrieve(description: string, data: Knowledge, labels: Record<string, string>) {
  const text = normalize(description);
  const positive = new Set<string>();
  const negative = new Set<string>();
  for (const [concept, terms] of Object.entries(data.symptoms)) {
    for (const term of terms) {
      for (const match of text.matchAll(pattern(term))) {
        (isNegated(text, match.index) ? negative : positive).add(concept);
      }
    }
  }
  const ambiguous = Object.fromEntries(Object.entries(data.ambiguous)
    .filter(([term]) => pattern(term).test(text)));
  const candidates = Object.entries(data.diseases).flatMap(([id, disease]) => {
    const matched = disease.symptoms.filter(s => positive.has(s)).sort();
    const conflicts = disease.symptoms.filter(s => negative.has(s)).sort();
    return matched.length ? [{ id, label: labels[id], score: matched.length - 2 * conflicts.length,
      matched, conflicts, unmentioned: disease.symptoms.filter(s => !positive.has(s) && !negative.has(s)).sort() }] : [];
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { positive: [...positive].sort(), negative: [...negative].sort(), ambiguous, candidates };
}

