import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromText, nextQuestion, compare, confirmationConcepts } from './engine.ts';
test('interview asks unseen features and unknown is not absent', () => {
  const answers = fromText('sin fiebre, tengo tos');
  assert.equal(answers.Fever.answer, 'no');
  assert.equal(answers.Cough.answer, 'yes');
  const next = nextQuestion(answers)!;
  assert.ok(!answers[next.id]);
  answers[next.id] = { answer: 'unknown', origin: 'confirmation' };
  const results = compare(answers);
  assert.ok(results.every((r) => !r.absent.includes(next.id)));
  assert.ok(
    confirmationConcepts(answers).some((c) => c.properties?.some((p) => p.value === 'unknown')),
  );
});
test('new text has independent answers and no diagnosis is emitted', () => {
  const initial = fromText('tos');
  initial.Nausea = { answer: 'yes', origin: 'confirmation' };
  const newer = fromText('fiebre');
  assert.equal(newer.Cough, undefined);
  assert.equal(newer.Nausea, undefined);
  assert.ok(compare(newer).every((r) => !('probability' in r) && !('diagnosis' in r)));
});
