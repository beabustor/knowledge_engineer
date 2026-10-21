import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { retrieve } from './demo.ts';
const data = JSON.parse(readFileSync(new URL('../data/knowledge.json', import.meta.url), 'utf8'));
test('respiratory candidate', () => {
  assert.equal(retrieve('Tengo fiebre, tos y dolor de garganta', data).candidates[0].id, 'ExampleCold');
});
test('synonyms, accents and negation', () => {
  const result = retrieve('CEFALEA y nauseas, pero sin fiebre', data);
  assert.equal(result.candidates[0].id, 'ExampleMigraine');
  assert.deepEqual(result.negative, ['fever']);
  assert.deepEqual(result.candidates.find(c => c.id === 'ExampleFlu')?.conflicts, ['fever']);
});
test('ambiguity and word boundaries', () => {
  const result = retrieve('frío y costoso', data);
  assert.equal(result.ambiguous['frío'].length, 2);
  assert.deepEqual(result.candidates, []);
});

test('English and Spanish share concepts, with localized output', () => {
  const english = retrieve('headache and nausea, but without fever', data, 'en');
  const spanish = retrieve('cefalea y náuseas, pero sin fiebre', data, 'es');
  assert.deepEqual(english.positive, spanish.positive);
  assert.deepEqual(english.negative, spanish.negative);
  assert.equal(english.candidates[0].label, 'Example migraine');
  assert.equal(spanish.candidates[0].label, 'Migraña de ejemplo');
  assert.deepEqual(retrieve('cold', data, 'en').candidates, []);
  assert.deepEqual(retrieve('not fever, but cough', data, 'en').negative, ['fever']);
});
