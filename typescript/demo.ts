/** Synthetic educational retrieval; not a diagnostic system. Node.js >= 22.18. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

type Language = 'en' | 'es';
type Locale = { labels: Record<string, string>; [key: string]: string | Record<string, string> };
function locale(lang: Language): Locale {
  return JSON.parse(readFileSync(new URL(`../locales/${lang}.json`, import.meta.url), 'utf8'));
}

export function retrieve(description: string, data: Knowledge, lang: Language = 'es') {
  const messages = locale(lang);
  const text = normalize(description);
  const positive = new Set<string>();
  const negative = new Set<string>();
  for (const [concept, terms] of Object.entries(data.symptoms)) {
    for (const term of terms) {
      for (const match of text.matchAll(pattern(term))) {
        const prefix = text.slice(0, match.index).split(/[.,;:!?\n]|\b(?:pero|aunque|but|however)\b/).at(-1)!;
        (/\b(?:sin|no|niego|not|without|deny|denies)\b/.test(prefix) ? negative : positive).add(concept);
      }
    }
  }
  const ambiguous = Object.fromEntries(Object.entries(data.ambiguous)
    .filter(([term]) => pattern(term).test(text)));
  const candidates = Object.entries(data.diseases).flatMap(([id, disease]) => {
    const matched = disease.symptoms.filter(s => positive.has(s)).sort();
    const conflicts = disease.symptoms.filter(s => negative.has(s)).sort();
    return matched.length ? [{ id, label: messages.labels[id], score: matched.length - 2 * conflicts.length,
      matched, conflicts, unmentioned: disease.symptoms.filter(s => !positive.has(s) && !negative.has(s)).sort() }] : [];
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { positive: [...positive].sort(), negative: [...negative].sort(), ambiguous, candidates };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let lang: Language = 'es';
  let json = false;
  const description: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang') {
      const value = args[++i];
      if (value !== 'en' && value !== 'es') {
        console.error('Supported languages / Idiomas admitidos: en, es');
        process.exit(2);
      }
      lang = value;
    } else if (args[i] === '--json') {
      json = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log('node typescript/demo.ts [--lang en|es] [--json] "Description / Descripción"');
      process.exit(0);
    } else if (args[i].startsWith('--')) {
      console.error('Unknown option / Opción desconocida: ' + args[i]);
      process.exit(2);
    } else {
      description.push(args[i]);
    }
  }
  const data: Knowledge = JSON.parse(readFileSync(new URL('../data/knowledge.json', import.meta.url), 'utf8'));
  const messages = locale(lang);
  const result = retrieve(description.join(' ') || String(messages.default_description), data, lang);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(messages.notice);
    if (!result.candidates.length) console.log(messages.none);
    for (const candidate of result.candidates) {
      console.log(`${messages.candidate}: ${candidate.label} (${messages.score}: ${candidate.score})`);
      for (const field of ['matched', 'conflicts', 'unmentioned'] as const) {
        console.log(`  ${messages[field]}: ${candidate[field].map(id => messages.labels[id]).join(', ') || '—'}`);
      }
    }
    if (Object.keys(result.ambiguous).length) {
      console.log(`${messages.ambiguous}: ${JSON.stringify(Object.fromEntries(
        Object.entries(result.ambiguous).map(([term, ids]) => [term, ids.map(id => messages.labels[id])])))} `);
    }
  }
}
