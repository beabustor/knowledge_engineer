import { mappings, records, stateOf, type Catalog, type Decisions } from './engine.ts';
const ns = {
  ex: 'https://example.org/semantic-change/',
  skos: 'http://www.w3.org/2004/02/skos/core#',
  prov: 'http://www.w3.org/ns/prov#',
  owl: 'http://www.w3.org/2002/07/owl#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  schema: 'https://schema.org/',
};
const q = (s: string) => JSON.stringify(s);
export type Triple = {
  s: string;
  p: string;
  o: string;
  literal?: boolean;
  lang?: string;
  datatype?: string;
};
export function graph(
  catalog: Catalog,
  decisions: Decisions = {},
  mappingIds?: string[],
  includeRecords = false,
) {
  const triples: Triple[] = [];
  const uri = (id: string) => ns.ex + id;
  const add = (
    s: string,
    p: string,
    o: string,
    literal = false,
    lang?: string,
    datatype?: string,
  ) => triples.push({ s, p, o, literal, lang, datatype });
  add(uri('Ontology'), ns.rdf + 'type', ns.owl + 'Ontology');
  add(uri('Ontology'), ns.owl + 'versionInfo', catalog.version, true);
  add(uri('classifiedAs'), ns.rdf + 'type', ns.owl + 'ObjectProperty');
  add(uri('classifiedAs'), ns.rdfs + 'domain', ns.schema + 'Product');
  add(uri('classifiedAs'), ns.rdfs + 'range', ns.skos + 'Concept');
  add(uri('Scheme'), ns.rdf + 'type', ns.skos + 'ConceptScheme');
  add(uri('Scheme'), ns.rdfs + 'label', 'Original synthetic procurement scheme', true, 'en');
  add(uri('Scheme'), ns.prov + 'wasDerivedFrom', 'https://www.w3.org/TR/skos-reference/');
  for (const c of catalog.concepts) {
    const id = uri('term/' + c.id);
    add(id, ns.rdf + 'type', ns.skos + 'Concept');
    add(id, ns.skos + 'inScheme', uri('Scheme'));
    for (const lang of ['en', 'es'] as const)
      add(id, ns.skos + 'prefLabel', c.labels[lang], true, lang);
    c.broader.forEach((p) => add(id, ns.skos + 'broader', uri('term/' + p)));
    if (c.deprecated) add(id, ns.owl + 'deprecated', 'true', true, undefined, ns.xsd + 'boolean');
    for (const r of c.replacements ?? []) add(id, ns.ex + 'proposedReplacement', uri('term/' + r));
    if (c.reference) add(id, ns.rdfs + 'seeAlso', c.reference);
  }
  const included = new Set(mappingIds ?? mappings.map((m) => m.id));
  for (const m of mappings.filter((m) => included.has(m.id))) {
    const id = uri('mapping/' + m.id),
      state = stateOf(m, catalog, decisions);
    add(id, ns.rdf + 'type', ns.schema + 'Product');
    add(id, ns.schema + 'sku', m.sku, true);
    add(id, ns.rdfs + 'label', m.sourceLabel, true);
    add(id, ns.prov + 'wasDerivedFrom', uri('supplier/' + m.supplier.replace(/ /g, '_')));
    add(id, ns.ex + 'classificationStatus', state.status, true);
    if (state.target) add(id, uri('classifiedAs'), uri('term/' + state.target));
    for (const [key, value] of Object.entries(m.attributes))
      add(
        id,
        uri(key),
        String(value),
        true,
        undefined,
        typeof value === 'number' ? ns.xsd + 'integer' : undefined,
      );
    const d = decisions[m.id];
    if (d) {
      const activity = uri('review/' + m.id);
      add(activity, ns.rdf + 'type', ns.prov + 'Activity');
      add(activity, ns.prov + 'used', uri('term/' + m.target));
      add(
        activity,
        ns.prov + 'wasAssociatedWith',
        uri('actor/' + d.actor.replace(/[^a-zA-Z0-9_-]/g, '_')),
      );
      add(activity, ns.rdfs + 'comment', d.reason, true, 'en');
      add(activity, ns.prov + 'endedAtTime', d.at, true, undefined, ns.xsd + 'dateTime');
      add(id, ns.prov + 'wasGeneratedBy', activity);
    }
  }
  if (includeRecords)
    for (const r of records.filter((r) => included.has(r.mapping))) {
      const id = uri('purchase/' + r.id);
      add(id, ns.rdf + 'type', ns.schema + 'OrderItem');
      add(id, ns.ex + 'sourceMapping', uri('mapping/' + r.mapping));
      add(id, ns.ex + 'amountCents', String(r.amountCents), true, undefined, ns.xsd + 'integer');
    }
  return triples;
}
export function serialize(triples: Triple[]) {
  const compact = (uri: string) => {
    for (const [key, value] of Object.entries(ns))
      if (uri.startsWith(value)) return key + ':' + uri.slice(value.length);
    return `<${uri}>`;
  };
  // Local IDs include slashes: full IRIs avoid invalid Turtle prefixed local names.
  const term = (uri: string) => (uri.startsWith(ns.ex) ? `<${uri}>` : compact(uri));
  const rdf =
    Object.entries(ns)
      .map(([k, v]) => `@prefix ${k}: <${v}> .`)
      .join('\n') +
    '\n' +
    triples
      .map(
        (t) =>
          `${term(t.s)} ${term(t.p)} ${t.literal ? q(t.o) + (t.lang ? '@' + t.lang : t.datatype ? '^^' + term(t.datatype) : '') : term(t.o)} .`,
      )
      .join('\n');
  const xml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const owl =
    '<?xml version="1.0"?>\n<rdf:RDF ' +
    Object.entries(ns)
      .map(([k, v]) => `xmlns:${k}="${v}"`)
      .join(' ') +
    '>\n' +
    triples
      .map((t) => {
        const predicate = compact(t.p);
        return `<rdf:Description rdf:about="${xml(t.s)}"><${predicate}${t.literal ? (t.lang ? ` xml:lang="${t.lang}"` : t.datatype ? ` rdf:datatype="${xml(t.datatype)}"` : '') + `>${xml(t.o)}</${predicate}>` : ` rdf:resource="${xml(t.o)}"/>`}</rdf:Description>`;
      })
      .join('\n') +
    '\n</rdf:RDF>';
  const cypher = triples
    .map(
      (t) =>
        `MERGE (s:Resource {iri: ${q(t.s)}})\n${t.literal ? `MERGE (v:Literal {value: ${q(t.o)}, language: ${q(t.lang ?? '')}, datatype: ${q(t.datatype ?? '')}}) MERGE (s)-[:FACT {predicate: ${q(t.p)}}]->(v);` : `MERGE (o:Resource {iri: ${q(t.o)}}) MERGE (s)-[:FACT {predicate: ${q(t.p)}}]->(o);`}`,
    )
    .join('\n');
  return { rdf, owl, cypher };
}
