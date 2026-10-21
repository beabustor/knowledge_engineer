import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  baseline,
  updated,
  mappings,
  records,
  diff,
  analyze,
  scenarioDecisions,
  suggestedDecision,
  validateCatalog,
  validateData,
} from './engine.ts';
import { graph, serialize } from './representations.ts';
test('version changes produce a bounded, complete dependency review queue', () => {
  assert.equal(mappings.length, 288);
  assert.equal(records.length, 8640);
  const before = analyze(baseline),
    after = analyze(updated);
  assert.equal(before.unresolvedRecords, 0);
  assert.equal(after.unresolvedMappings, 30);
  assert.equal(after.unresolvedRecords, 900);
  assert.equal(after.affectedRecords, 1260);
  assert.equal(
    after.groups.filter((g) => g.pending > 0).reduce((s, g) => s + g.pending, 0),
    30,
  );
  assert.equal(diff(baseline, updated).filter((c) => c.kind === 'merged').length, 2);
  assert.equal(after.totalCents, before.totalCents);
});
test('split needs evidence; quarantine preserves records and cents', () => {
  const ds = scenarioDecisions(),
    after = analyze(updated, ds),
    before = analyze(baseline);
  assert.equal(after.unresolvedRecords, 0);
  assert.equal(after.quarantinedRecords, 180);
  assert.equal(
    after.byCategory.reduce((a, r) => a + r.count, 0),
    records.length,
  );
  assert.equal(
    after.byCategory.reduce((a, r) => a + r.amountCents, 0),
    before.totalCents,
  );
  for (const m of mappings.filter((m) => m.target === 'ProtectiveGlove'))
    assert.equal(
      ds[m.id].target,
      m.attributes.material === 'nitrile' ? 'NitrileGlove' : 'LatexGlove',
    );
  const unsupported = { ...mappings.find((m) => m.target === 'ProtectiveGlove')!, attributes: {} };
  assert.throws(() => suggestedDecision(unsupported, updated));
  assert.deepEqual(validateData(updated, ds), []);
});
test('same identifier label change does not require migration, hierarchy change changes reports', () => {
  const a = analyze(updated, scenarioDecisions()),
    b = analyze(baseline);
  assert.equal(
    a.byCategory.find((r) => r.id === 'Consumables')!.count -
      b.byCategory.find((r) => r.id === 'Consumables')!.count,
    180,
  );
  assert.equal(
    a.byCategory.find((r) => r.id === 'Glassware')!.count -
      b.byCategory.find((r) => r.id === 'Glassware')!.count,
    -180,
  );
  assert.equal(a.states.get(mappings.find((m) => m.target === 'Water')!.id)!.status, 'valid');
});
test('cycles and invalid reviewed targets fail, decisions never assert equivalence', () => {
  const bad = structuredClone(updated);
  bad.concepts.find((c) => c.id === 'Supplies')!.broader = ['Glassware'];
  assert.ok(validateCatalog(bad).some((e) => e.includes('cycle')));
  const ds = scenarioDecisions();
  ds.M0001 = {
    mapping: 'M0001',
    disposition: 'mapped',
    target: 'Invented',
    reason: 'test',
    actor: 'test',
    at: '2026-10-21T00:00:00Z',
  };
  assert.ok(validateData(updated, ds).some((e) => e.includes('Invalid reviewed target')));
  const output = serialize(graph(updated, scenarioDecisions(), ['M0145'], true));
  assert.match(output.rdf, /prov:wasGeneratedBy/);
  assert.doesNotMatch(output.rdf, /owl:(sameAs|equivalentClass)/);
});
