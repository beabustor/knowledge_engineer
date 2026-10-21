/** Synthetic educational retrieval; not a diagnostic system. Node.js >= 22.18. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { retrieve as retrieveCore } from './core.ts';
type Language = 'en' | 'es';
type Locale = { labels: Record<string, string>; [key: string]: string | Record<string, string> };
function locale(lang: Language): Locale {
  return JSON.parse(readFileSync(new URL(`../locales/${lang}.json`, import.meta.url), 'utf8'));
}
export function retrieve(description: string, data: Parameters<typeof retrieveCore>[1], lang: Language = 'es') {
  return retrieveCore(description, data, locale(lang).labels);
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
      console.log('node 06-examples/typescript/demo.ts [--lang en|es] [--json] "Description / Descripción"');
      process.exit(0);
    } else if (args[i].startsWith('--')) {
      console.error('Unknown option / Opción desconocida: ' + args[i]);
      process.exit(2);
    } else {
      description.push(args[i]);
    }
  }
  const data: Knowledge = JSON.parse(readFileSync(new URL('../../01-data/knowledge.json', import.meta.url), 'utf8'));
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
