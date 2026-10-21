import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchConcepts, representations } from './model.ts';
const catalog = JSON.parse(
  readFileSync(new URL('../01-data/catalog.json', import.meta.url), 'utf8'),
).concepts;
test('bilingual clinical and chemical terms, negation and identifiers', () => {
  const results = matchConcepts('sin tos, tomo ácido acetilsalicílico y water', catalog);
  assert.equal(results.find((r) => r.concept.id === 'Cough')?.evidence[0].negated, true);
  assert.ok(results.some((r) => r.concept.code === 'CHEBI:15365'));
  assert.ok(results.some((r) => r.concept.id === 'Water'));
  assert.equal(matchConcepts('R05', catalog)[0].concept.id, 'Cough');
  assert.equal(matchConcepts('costoso', catalog).length, 0);
  assert.equal(matchConcepts('aspirin and cough', catalog, 'chemical').length, 1);
});
test('representations retain provenance, bilingual labels and local hierarchy', () => {
  for (const c of catalog) {
    const r = representations(c, catalog);
    assert.ok(r.owl.includes('rdf:RDF'));
    assert.ok(r.rdf.includes('rdfs:seeAlso'));
    assert.ok(r.cypher.includes(c.id));
    assert.ok(r.sql.includes(c.id));
    if (c.parent) assert.ok(r.owl.includes('rdfs:subClassOf'));
    assert.ok(!r.owl.includes('equivalentClass'));
  }
});
test('fever and sin fuerzas are positive findings; temperature unit is not invented', async () => {
  const { reportedConcepts } = await import('./observations.ts');
  const { temperatures } = await import('./02-text/clinical-language.ts');
  const result = matchConcepts('tengo fiebre de 38 grados y me encuentro sin fuerzas', catalog);
  assert.ok(result.some((r) => r.concept.code === 'R50.9'));
  assert.equal(result.find((r) => r.concept.code === 'R53')?.evidence[0].negated, false);
  assert.equal(
    matchConcepts('sin fiebre, con debilidad', catalog).find((r) => r.concept.code === 'R50.9')
      ?.evidence[0].negated,
    true,
  );
  assert.equal(temperatures('38,5 grados Celsius')[0].value, 38.5);
  assert.equal(temperatures('38 grados')[0].unit, 'unspecified');
  assert.equal(temperatures('100 degrees Fahrenheit')[0].unit, 'F');
  assert.ok(
    reportedConcepts('fiebre de 38 grados').some((c) => c.properties?.some((p) => p.value === 38)),
  );
  assert.equal(reportedConcepts('no tengo 38 grados').length, 0);
});

test('purple spots are a descriptive finding, not an inferred disease or code', async () => {
  const { temperatures } = await import('./02-text/clinical-language.ts');
  const result = matchConcepts(
    'Tengo 35 años y tengo 38.5 de fiebre y manchas moradas en la piel',
    catalog,
  );
  const spots = result.find((r) => r.concept.id === 'PurpleSkinSpots');
  const { reportedConcepts } = await import('./observations.ts');
  assert.ok(
    reportedConcepts('Tengo 35 años y tengo 38.5 de fiebre').some((c) =>
      c.properties?.some((p) => p.property === 'reportedAgeValue' && p.value === 35),
    ),
  );
  assert.ok(spots);
  assert.equal(spots.concept.code, undefined);
  assert.equal(spots.evidence[0].negated, false);
  assert.equal(temperatures('tengo 38.5 de fiebre')[0].value, 38.5);
  assert.equal(
    matchConcepts('no tengo manchas moradas', catalog).find(
      (r) => r.concept.id === 'PurpleSkinSpots',
    )?.evidence[0].negated,
    true,
  );
});
