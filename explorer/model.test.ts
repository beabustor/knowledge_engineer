import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchConcepts, representations } from './model.ts';
const catalog = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url), 'utf8')).concepts;
test('bilingual clinical and chemical terms, negation and identifiers', () => {
 const results = matchConcepts('sin tos, tomo ácido acetilsalicílico y water', catalog);
 assert.equal(results.find(r => r.concept.id === 'Cough')?.evidence[0].negated, true);
 assert.ok(results.some(r => r.concept.code === 'CHEBI:15365'));
 assert.ok(results.some(r => r.concept.id === 'Water'));
 assert.equal(matchConcepts('R05',catalog)[0].concept.id,'Cough');
 assert.equal(matchConcepts('costoso',catalog).length,0);
 assert.equal(matchConcepts('aspirin and cough',catalog,'chemical').length,1);
});
test('representations retain provenance, bilingual labels and local hierarchy', () => {
 for (const c of catalog) {
  const r = representations(c,catalog);
  assert.ok(r.owl.includes('rdf:RDF'));
  assert.ok(r.rdf.includes('rdfs:seeAlso'));
  assert.ok(r.cypher.includes(c.id));
  assert.ok(r.sql.includes(c.id));
  if(c.parent) assert.ok(r.owl.includes('rdfs:subClassOf'));
  assert.ok(!r.owl.includes('equivalentClass'));
 }
});
