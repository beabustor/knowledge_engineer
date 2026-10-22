import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseline, updated, caseSummary, caseMappings, reviewMaterial } from './glove-case.ts';
test('one case traces 180 lines across six SKUs and two explicit material decisions', () => {
  const before = caseSummary(baseline),
    broken = caseSummary(updated);
  assert.equal(before.total, 180);
  assert.equal(before.pending, 0);
  assert.equal(broken.pending, 180);
  assert.equal(caseMappings.length, 6);
  assert.throws(() => reviewMaterial({}, 'nitrile', 'LatexGlove'));
  const half = reviewMaterial({}, 'nitrile', 'NitrileGlove');
  assert.equal(caseSummary(updated, half).pending, 90);
  const ds = reviewMaterial(half, 'latex', 'LatexGlove');
  const after = caseSummary(updated, ds);
  assert.equal(after.pending, 0);
  assert.equal(after.reviewed, 6);
  assert.equal(after.materialCorrect, true);
  assert.deepEqual(
    after.rows.map((r) => [r.id, r.count]),
    [
      ['LatexGlove', 90],
      ['NitrileGlove', 90],
    ],
  );
  assert.equal(after.totalCents, before.totalCents);
  assert.equal(Object.keys(ds).length, 6);
  assert.equal(Object.keys(half).length, 3);
});
