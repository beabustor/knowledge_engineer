/** Anonymous public terminology lookup. No personal description is sent automatically. */
import type { Concept } from '../../02-model/model.ts';
export type Source = 'ols' | 'chebi' | 'hpo' | 'cima' | 'wikidata' | 'icd10';
export const SOURCES: Record<Source, string> = {
  ols: 'OLS · All ontologies / Todas',
  chebi: 'ChEBI · Chemicals / Sustancias',
  hpo: 'HPO · Phenotypes / Fenotipos',
  wikidata: 'Wikidata · General · EN/ES',
  icd10: 'NLM · ICD-10-CM · US · EN',
  cima: 'CIMA · Medicines / Medicamentos · ES',
};
const isOls = (source: Source) => ['ols', 'chebi', 'hpo'].includes(source);
export const LIMIT_MINUTE = 6,
  LIMIT_DAY = 30;
const key = 'knowledge-public-lookups-v1';
let pending = false;
let fallback: number[] = [];
const cache = new Map<string, Concept[]>();
export function reserve(times: number[], now: number) {
  const recent = times.filter((t) => Number.isFinite(t) && t <= now && t > now - 86400000);
  if (recent.filter((t) => t > now - 60000).length >= LIMIT_MINUTE || recent.length >= LIMIT_DAY)
    throw new Error(
      'Limit reached: 6 requests/minute, 30/24h / Límite: 6 peticiones/minuto, 30/24 h',
    );
  return [...recent, now];
}
export function lookupUrl(source: Source, term: string, language: 'en' | 'es' = 'en') {
  if (!Object.hasOwn(SOURCES, source)) throw new Error('Unknown source');
  if (term.trim().length < 2 || term.length > 80)
    throw new Error('Use 2–80 characters / Usa 2–80 caracteres');
  if (isOls(source))
    return `https://www.ebi.ac.uk/ols4/api/search?${new URLSearchParams({ q: term, rows: '5', ...(source === 'chebi' ? { ontology: 'chebi' } : source === 'hpo' ? { ontology: 'hp' } : {}) })}`;
  if (source === 'wikidata')
    return (
      'https://www.wikidata.org/w/api.php?' +
      new URLSearchParams({
        action: 'wbsearchentities',
        search: term,
        language,
        uselang: language,
        format: 'json',
        origin: '*',
        limit: '5',
        type: 'item',
      })
    );
  if (source === 'icd10')
    return (
      'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?' +
      new URLSearchParams({ sf: 'code,name', terms: term, maxList: '5' })
    );
  return `https://cima.aemps.es/cima/rest/medicamentos?${new URLSearchParams({ nombre: term })}`;
}
export function normalizeResults(
  source: Source,
  data: unknown,
  language: 'en' | 'es' = 'en',
): Concept[] {
  if (!Object.hasOwn(SOURCES, source)) throw new Error('Unknown source');
  const body = data as {
    response?: { docs?: Record<string, unknown>[] };
    resultados?: Record<string, unknown>[];
    search?: Record<string, unknown>[];
  };
  let rows: Record<string, unknown>[] | undefined;
  if (source === 'icd10') {
    if (!Array.isArray(data) || !Array.isArray(data[3])) throw new Error('Unexpected NLM response');
    rows = data[3]
      .filter((r: unknown) => Array.isArray(r) && r.length >= 2)
      .map((r: unknown[]) => ({ code: r[0], name: r[1] }));
  } else
    rows = isOls(source)
      ? body?.response?.docs
      : source === 'wikidata'
        ? body?.search
        : body?.resultados;
  if (!Array.isArray(rows)) throw new Error('Unexpected source response / Respuesta no reconocida');
  return rows.slice(0, 5).flatMap((row, i) => {
    const label = String(
      isOls(source) || source === 'wikidata'
        ? (row.label ?? '')
        : source === 'icd10'
          ? (row.name ?? '')
          : (row.nombre ?? ''),
    ).slice(0, 300);
    const code = String(
      isOls(source)
        ? (row.obo_id ?? row.short_form ?? '')
        : source === 'wikidata'
          ? (row.id ?? '')
          : source === 'icd10'
            ? (row.code ?? '')
            : (row.nregistro ?? ''),
    ).slice(0, 100);
    if (source === 'hpo' && !/^HP[:_]/.test(code)) return [];
    if (source === 'chebi' && !/^CHEBI[:_]/.test(code)) return [];
    if (source === 'wikidata' && !/^Q[1-9][0-9]*$/.test(code)) return [];
    const iri = isOls(source)
      ? String(row.iri ?? '')
      : source === 'wikidata'
        ? `https://www.wikidata.org/entity/${code}`
        : source === 'icd10'
          ? lookupUrl('icd10', code)
          : `https://cima.aemps.es/cima/dochtml/ft/${encodeURIComponent(code)}/FT.html`;
    if (!label || !code || !/^https?:\/\//.test(iri)) return [];
    return [
      {
        id: `Remote_${source}_${code.replace(/[^a-zA-Z0-9_]/g, '_')}_${i}`,
        domain:
          source === 'cima'
            ? 'medication'
            : source === 'wikidata'
              ? 'general'
              : source === 'chebi'
                ? 'chemical'
                : 'biomedical',
        labels: { en: label, es: label },
        aliases: { en: [], es: [] },
        code,
        source: isOls(source)
          ? `OLS · ${String(row.ontology_name ?? (source === 'hpo' ? 'hp' : source)).slice(0, 80)}`
          : SOURCES[source],
        version:
          source === 'icd10'
            ? 'NLM ICD-10-CM current service; US edition, release not pinned / edición US, versión sin fijar'
            : 'Live query; source release not pinned / Consulta en vivo; versión sin fijar',
        url: iri,
        status: 'remote',
        retrievedAt: new Date().toISOString(),
        labelLanguage:
          source === 'wikidata'
            ? (row.display as { label?: { language?: string } } | undefined)?.label?.language ===
              'es'
              ? 'es'
              : (row.display as { label?: { language?: string } } | undefined)?.label?.language ===
                  'en'
                ? 'en'
                : undefined
            : source === 'icd10'
              ? 'en'
              : source === 'cima'
                ? 'es'
                : undefined,
        sourceLicense:
          source === 'wikidata'
            ? 'Wikidata structured data · CC0'
            : source === 'icd10'
              ? 'NLM/CMS source terms; ICD-10-CM US adaptation'
              : 'Source-specific terms / Condiciones de la fuente',
        description: String(row.description ?? '').slice(0, 500),
      },
    ];
  });
}
export async function lookup(source: Source, term: string, language: 'en' | 'es' = 'en') {
  term = term.trim();
  const url = lookupUrl(source, term, language);
  const cacheKey = language + ':' + source + ':' + term.toLowerCase();
  if (cache.has(cacheKey)) return { concepts: cache.get(cacheKey)!, cached: true };
  if (pending) throw new Error('One request at a time / Una petición a la vez');
  let history = fallback;
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (Array.isArray(saved)) history = saved.filter((t) => typeof t === 'number');
  } catch {
    /* Storage disabled: current tab only. */
  }
  fallback = reserve(history, Date.now());
  try {
    localStorage.setItem(key, JSON.stringify(fallback));
  } catch {
    /* No fingerprinting or IP collection. */
  }
  pending = true;
  try {
    const proxyBase = import.meta.env.VITE_LOOKUP_API_BASE as string | undefined;
    let endpoint = url;
    if (proxyBase) {
      const base = new URL(proxyBase);
      if (
        base.protocol !== 'https:' &&
        !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname))
      )
        throw new Error('HTTPS proxy required');
      endpoint =
        proxyBase.replace(/\/$/, '') + '/lookup?' + new URLSearchParams({ source, term, language });
    }
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(12000),
      credentials: 'omit',
    });
    if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
    const concepts = normalizeResults(source, await response.json(), language);
    if (cache.size >= 50) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, concepts);
    return { concepts, cached: false };
  } finally {
    pending = false;
  }
}
