/** One catalog -> lexical matches and five interoperable representations. */
import { normalize } from '../typescript/core.ts';
import { isNegated } from '../typescript/clinical-language.ts';
export type Language = 'en' | 'es';
export type Concept = {
  id: string; domain: string; labels: Record<Language, string>;
  aliases: Record<Language, string[]>; parent?: string; code?: string; formula?: string;
  retrievedAt?:string; labelLanguage?:Language; sourceLicense?:string; description?:string;
  kind?: string; domainId?: string; rangeId?: string; classId?: string;
  properties?: {property: string; value?: number | string; target?: string}[];
  source: string; version: string; url: string; status: string;
};
export function displayLabel(c:Concept,lang:Language){return c.code&&c.labels[lang]===c.code?c.labels.es:c.labels[lang];}
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function matchConcepts(text: string, concepts: Concept[], domain = 'all') {
  const normalized = normalize(text);
  return concepts.filter(c => domain === 'all' || c.domain === domain).flatMap(concept => {
    const evidence: { term: string; negated: boolean }[] = [];
    const terms = [...new Set([...concept.aliases.en, ...concept.aliases.es, ...(concept.code ? [concept.code] : [])])];
    for (const term of terms) {
      if(!normalized.includes(normalize(term))) continue;
      const regex = new RegExp(`(?<![\\p{L}\\p{N}_])${escape(normalize(term))}(?![\\p{L}\\p{N}_])`, 'gu');
      for (const match of normalized.matchAll(regex)) {
        evidence.push({ term, negated: isNegated(normalized, match.index) });
      }
    }
    return evidence.length ? [{ concept, evidence }] : [];
  });
}
const q = (value: string) => JSON.stringify(value);
const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const base = 'https://example.org/knowledge-explorer/';
export function representations(concept: Concept, concepts: Concept[], annotationIds:string[]=[]) {
  const nodes: Concept[] = [];
  const visit = (id?: string) => {
    const c = concepts.find(n => n.id === id);
    if (!c || nodes.some(n => n.id === c.id)) return;
    nodes.push(c);
    [c.parent,c.classId,c.domainId,c.rangeId].forEach(visit);
    c.properties?.forEach(p => {visit(p.property);visit(p.target);});
  };
  visit(concept.id);
  annotationIds.forEach(visit);
  type Triple = {s:string;p:string;o:string;literal?:boolean;lang?:string;datatype?:string};
  const triples: Triple[] = [];
  const push=(s:string,p:string,o:string)=>triples.push({s,p,o});
  const lit=(s:string,p:string,o:string,lang?:string,datatype?:string)=>triples.push({s,p,o,literal:true,lang,datatype});
  push('ex:Ontology','rdf:type','owl:Ontology');
  for(const p of ['sourceCode','sourceVersion','formula','provenanceKind'])push('ex:'+p,'rdf:type','owl:AnnotationProperty');
  for(const c of nodes){
    const id='ex:'+c.id;
    const type=c.kind==='attribute'?'owl:DatatypeProperty':c.kind==='relationship'?'owl:ObjectProperty':c.kind==='annotation'?'owl:AnnotationProperty':c.kind==='individual'?'owl:NamedIndividual':'owl:Class';
    push(id,'rdf:type',type);
    if(c.status==='remote'){lit(id,'rdfs:label',c.labels.en,c.labelLanguage);lit(id,'skos:prefLabel',c.labels.en,c.labelLanguage);}
    else {for(const lang of ['en','es'] as const){lit(id,'rdfs:label',c.labels[lang],lang);lit(id,'skos:prefLabel',c.labels[lang],lang);for(const alias of new Set(c.aliases[lang]))if(alias!==c.labels[lang])lit(id,'skos:altLabel',alias,lang);}}
    push(id,'prov:wasDerivedFrom',c.url);
    if(c.retrievedAt)lit(id,'prov:generatedAtTime',c.retrievedAt,undefined,'xsd:dateTime');
    if(c.sourceLicense)lit(id,'dcterms:rights',c.sourceLicense);
    if(c.description)lit(id,'skos:note',c.description,c.labelLanguage);
    push(id,'rdfs:seeAlso',c.url);lit(id,'ex:sourceVersion',c.version);lit(id,'ex:provenanceKind',c.status);
    if(c.code)lit(id,'ex:sourceCode',c.code);
    if(c.formula)lit(id,'ex:formula',c.formula);
    if(c.parent)push(id,'rdfs:subClassOf','ex:'+c.parent);
    if(c.classId)push(id,'rdf:type','ex:'+c.classId);
    if(c.domainId)push(id,'rdfs:domain','ex:'+c.domainId);
    if(c.rangeId)push(id,'rdfs:range',(c.kind==='attribute'?'xsd:':'ex:')+c.rangeId);
    c.properties?.forEach(p=>{
      if(p.target)push(id,'ex:'+p.property,'ex:'+p.target);
      else {
        const prop=concepts.find(c=>c.id===p.property);
        lit(id,'ex:'+p.property,String(p.value),undefined,'xsd:'+(prop?.rangeId??'decimal'));
      }
    });
  }
  const ns:Record<string,string>={ex:base,rdf:'http://www.w3.org/1999/02/22-rdf-syntax-ns#',rdfs:'http://www.w3.org/2000/01/rdf-schema#',owl:'http://www.w3.org/2002/07/owl#',skos:'http://www.w3.org/2004/02/skos/core#',prov:'http://www.w3.org/ns/prov#',dcterms:'http://purl.org/dc/terms/',xsd:'http://www.w3.org/2001/XMLSchema#'};
  const uri=(id:string)=>{const i=id.indexOf(':');return ns[id.slice(0,i)]?ns[id.slice(0,i)]+id.slice(i+1):id;};
  const term=(id:string)=>/^https?:\/\//.test(id)?`<${id}>`:id;
  const ttl=Object.entries(ns).map(([k,v])=>`@prefix ${k}: <${v}> .`);
  triples.forEach(t=>ttl.push(`${term(t.s)} ${term(t.p)} ${t.literal?q(t.o)+(t.lang?'@'+t.lang:t.datatype?'^^'+t.datatype:''):term(t.o)} .`));
  const owl=`<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF ${Object.entries(ns).map(([k,v])=>`xmlns:${k}="${v}"`).join(' ')}>
${triples.map(t=>`  <rdf:Description rdf:about="${xml(uri(t.s))}"><${t.p}${t.literal?(t.lang?` xml:lang="${t.lang}"`:t.datatype?` rdf:datatype="${xml(uri(t.datatype))}"`:'')+`>${xml(t.o)}</${t.p}>`:` rdf:resource="${xml(uri(t.o))}"/>`}</rdf:Description>`).join('\n')}
</rdf:RDF>`;
  const cypher=nodes.map(c=>`MERGE (c:ExplorerConcept {id: ${q(c.id)}}) SET c.kind = ${q(c.kind??'entity')}, c.label_en = ${q(c.labels.en)}, c.label_es = ${q(c.labels.es)}, c.source = ${q(c.source)}, c.version = ${q(c.version)}, c.url = ${q(c.url)}, c.code = ${q(c.code??'')}, c.formula = ${q(c.formula??'')};`);
  for(const c of nodes){
    for(const [rel,target] of [['IS_A',c.parent],['INSTANCE_OF',c.classId],['DOMAIN',c.domainId],['RANGE',c.kind==='attribute'?undefined:c.rangeId]]) {
      if(target)cypher.push(`MATCH (c:ExplorerConcept {id: ${q(c.id)}}), (p:ExplorerConcept {id: ${q(target)}}) MERGE (c)-[:${rel}]->(p);`);
    }
    if(c.kind==='attribute')cypher.push(`MATCH (c:ExplorerConcept {id: ${q(c.id)}}) SET c.datatype = ${q(c.rangeId??'')};`);
    c.properties?.forEach(p=>{
      if(p.target)cypher.push(`MATCH (c:ExplorerConcept {id: ${q(c.id)}}), (p:ExplorerConcept {id: ${q(p.target)}}) MERGE (c)-[:${p.property}]->(p);`);
      else cypher.push(`MATCH (c:ExplorerConcept {id: ${q(c.id)}}) SET c.${p.property} = ${typeof p.value==='string'?q(p.value):p.value};`);
    });
  }
  const sq=(s:string)=>"'"+s.replace(/'/g,"''")+"'";
  const sql=['-- SQLite: generic RDF triple table preserves types, language and provenance.', 'CREATE TABLE IF NOT EXISTS explorer_triple (subject TEXT, predicate TEXT, object TEXT, literal INTEGER, language TEXT, datatype TEXT, PRIMARY KEY(subject,predicate,object,language,datatype));'];
  triples.forEach(t=>sql.push(`INSERT OR IGNORE INTO explorer_triple VALUES (${[uri(t.s),uri(t.p),t.literal?t.o:uri(t.o)].map(sq).join(', ')}, ${t.literal?1:0}, ${sq(t.lang??'')}, ${sq(t.datatype?uri(t.datatype):'')});`));
  sql.push('SELECT * FROM explorer_triple;');
  return {rdf:ttl.join('\n')+'\n',owl,cypher:cypher.join('\n')+'\n',sql:sql.join('\n')+'\n'};
}
