/** Deterministic impact analysis. No LLM, no automatic split/merge approval. */
import v1 from '../../01-data/02-impact-scenario/catalog-v1.json' with { type: 'json' };
import v2 from '../../01-data/02-impact-scenario/catalog-v2.json' with { type: 'json' };
import sourceMappings from '../../01-data/02-impact-scenario/mappings.json' with { type: 'json' };
import sourceRecords from '../../01-data/02-impact-scenario/records.json' with { type: 'json' };
export type Lang = 'en' | 'es';
export type Term = {
  id: string;
  labels: Record<Lang, string>;
  broader: string[];
  deprecated?: boolean;
  replacements?: string[];
  reference?: string;
};
export type Catalog = { version: string; synthetic: boolean; concepts: Term[] };
export type Mapping = {
  id: string;
  supplier: string;
  sku: string;
  sourceLabel: string;
  target: string;
  attributes: Record<string, string | number>;
  review: string;
};
export type Purchase = {
  id: string;
  mapping: string;
  department: string;
  month: string;
  quantity: number;
  amountCents: number;
};
export type Decision = {
  mapping: string;
  disposition: 'mapped' | 'quarantined';
  target?: string;
  reason: string;
  actor: string;
  at: string;
};
export type Decisions = Record<string, Decision>;
export type Kind =
  'renamed' | 'deprecated' | 'split' | 'merged' | 'reparented' | 'removed' | 'added';
export type Change = { id: string; kind: Kind; before?: Term; after?: Term; targets: string[] };
export const baseline = v1 as Catalog,
  updated = v2 as Catalog;
export const mappings = sourceMappings as unknown as Mapping[],
  records: Purchase[] = sourceRecords.rows.map((row) =>
    Object.fromEntries(sourceRecords.columns.map((key, index) => [key, row[index]])),
  ) as Purchase[];
export function diff(before: Catalog, after: Catalog): Change[] {
  const old = new Map(before.concepts.map((c) => [c.id, c])),
    next = new Map(after.concepts.map((c) => [c.id, c]));
  const replacementCount = new Map<string, number>();
  for (const c of after.concepts)
    for (const r of c.replacements ?? [])
      replacementCount.set(r, (replacementCount.get(r) ?? 0) + 1);
  const changes: Change[] = [];
  for (const a of before.concepts) {
    const b = next.get(a.id);
    let kind: Kind | undefined;
    if (!b) kind = 'removed';
    else if (b.deprecated && !a.deprecated) {
      const rs = b.replacements ?? [];
      kind =
        rs.length > 1
          ? 'split'
          : rs.length === 1 && (replacementCount.get(rs[0]) ?? 0) > 1
            ? 'merged'
            : 'deprecated';
    } else if (JSON.stringify([...a.broader].sort()) !== JSON.stringify([...b.broader].sort()))
      kind = 'reparented';
    else if (a.labels.en !== b.labels.en || a.labels.es !== b.labels.es) kind = 'renamed';
    if (kind) changes.push({ id: a.id, kind, before: a, after: b, targets: b?.replacements ?? [] });
  }
  for (const b of after.concepts)
    if (!old.has(b.id)) changes.push({ id: b.id, kind: 'added', after: b, targets: [] });
  return changes;
}
export function validateCatalog(catalog: Catalog): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const byId = new Map(catalog.concepts.map((c) => [c.id, c]));
  for (const c of catalog.concepts) {
    if (ids.has(c.id)) errors.push('Duplicate identifier: ' + c.id);
    ids.add(c.id);
    if (!c.labels.en || !c.labels.es) errors.push('Missing EN/ES label: ' + c.id);
    for (const p of c.broader)
      if (!byId.has(p)) errors.push('Missing broader target: ' + c.id + ' → ' + p);
    for (const p of c.replacements ?? [])
      if (!byId.has(p) || byId.get(p)!.deprecated)
        errors.push('Invalid replacement: ' + c.id + ' → ' + p);
  }
  const done = new Set<string>(),
    visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) {
      errors.push('Hierarchy cycle: ' + id);
      return;
    }
    if (done.has(id)) return;
    visiting.add(id);
    for (const p of byId.get(id)?.broader ?? []) visit(p);
    visiting.delete(id);
    done.add(id);
  };
  for (const id of ids) visit(id);
  return errors;
}
export function ancestors(id: string, catalog: Catalog) {
  const byId = new Map(catalog.concepts.map((c) => [c.id, c]));
  const found = new Set<string>();
  const walk = (key: string) => {
    if (found.has(key)) return;
    const c = byId.get(key);
    if (!c || c.deprecated) return;
    found.add(key);
    c.broader.forEach(walk);
  };
  walk(id);
  return found;
}
export function stateOf(m: Mapping, catalog: Catalog, decisions: Decisions) {
  const d = decisions[m.id];
  const target = d?.target ?? m.target;
  if (d?.disposition === 'quarantined') return { target: null, status: 'quarantined' as const };
  const c = catalog.concepts.find((c) => c.id === target);
  return { target, status: c && !c.deprecated ? ('valid' as const) : ('unresolved' as const) };
}
export function suggestedDecision(
  m: Mapping,
  catalog: Catalog,
  actor = 'scenario-review',
  at = new Date().toISOString(),
): Decision {
  const c = catalog.concepts.find((c) => c.id === m.target);
  const targets = c?.replacements ?? [];
  if (!c)
    return {
      mapping: m.id,
      disposition: 'quarantined',
      reason:
        'Removed without an equivalent replacement. Preserve purchase; quarantine classification.',
      actor,
      at,
    };
  let target = targets.length === 1 ? targets[0] : undefined;
  if (m.target === 'ProtectiveGlove')
    target =
      m.attributes.material === 'nitrile'
        ? 'NitrileGlove'
        : m.attributes.material === 'latex'
          ? 'LatexGlove'
          : undefined;
  if (!target || !catalog.concepts.some((c) => c.id === target && !c.deprecated))
    throw new Error('No justified scenario proposal for ' + m.id);
  return {
    mapping: m.id,
    disposition: 'mapped',
    target,
    reason:
      targets.length > 1
        ? 'Explicit scenario review uses supplier material attribute; no global equivalence.'
        : 'Explicit scenario review of replacement; original product attributes retained.',
    actor,
    at,
  };
}
export function scenarioDecisions(catalog: Catalog = updated) {
  const decisions: Decisions = {};
  for (const m of mappings)
    if (stateOf(m, catalog, {}).status === 'unresolved')
      decisions[m.id] = suggestedDecision(m, catalog);
  return decisions;
}
export function analyze(catalog: Catalog, decisions: Decisions = {}) {
  const states = new Map(mappings.map((m) => [m.id, stateOf(m, catalog, decisions)]));
  const changed = diff(baseline, catalog);
  const changedIds = new Set(changed.map((c) => c.id));
  const affectedMappings = mappings.filter((m) => changedIds.has(m.target));
  const affectedIds = new Set(affectedMappings.map((m) => m.id));
  const unresolvedMappings = mappings.filter((m) => states.get(m.id)!.status === 'unresolved');
  const groups = changed
    .filter((c) => c.kind !== 'added')
    .map((change) => {
      const ms = mappings.filter((m) => m.target === change.id),
        ids = new Set(ms.map((m) => m.id));
      const rows = records.filter((r) => ids.has(r.mapping));
      return {
        change,
        mappings: ms,
        records: rows.length,
        amountCents: rows.reduce((a, r) => a + r.amountCents, 0),
        pending: ms.filter((m) => states.get(m.id)!.status === 'unresolved').length,
      };
    })
    .sort(
      (a, b) =>
        b.pending - a.pending ||
        b.amountCents - a.amountCents ||
        a.change.id.localeCompare(b.change.id),
    );
  const byCategory = new Map<string, { id: string; count: number; amountCents: number }>();
  const mappingMap = new Map(mappings.map((m) => [m.id, m]));
  const hierarchy = new Map(catalog.concepts.map((c) => [c.id, ancestors(c.id, catalog)]));
  for (const r of records) {
    const state = states.get(r.mapping)!;
    const category =
      state.status !== 'valid'
        ? state.status
        : (catalog.concepts.find(
            (c) => c.broader.includes('Supplies') && hierarchy.get(state.target!)!.has(c.id),
          )?.id ?? 'uncategorized');
    const row = byCategory.get(category) ?? { id: category, count: 0, amountCents: 0 };
    row.count++;
    row.amountCents += r.amountCents;
    byCategory.set(category, row);
  }
  const totalCents = records.reduce((sum, r) => sum + r.amountCents, 0);
  const unresolvedRecords = records.filter(
    (r) => states.get(r.mapping)!.status === 'unresolved',
  ).length;
  const quarantinedRecords = records.filter(
    (r) => states.get(r.mapping)!.status === 'quarantined',
  ).length;
  return {
    changes: changed,
    groups,
    states,
    affectedMappings: affectedMappings.length,
    affectedRecords: records.filter((r) => affectedIds.has(r.mapping)).length,
    unresolvedMappings: unresolvedMappings.length,
    unresolvedRecords,
    quarantinedRecords,
    totalCents,
    byCategory: [...byCategory.values()].sort((a, b) => a.id.localeCompare(b.id)),
    errors: validateCatalog(catalog),
    mappingMap,
  };
}
export function validateData(catalog: Catalog, decisions: Decisions = {}) {
  const errors = validateCatalog(catalog);
  const ids = new Set(mappings.map((m) => m.id));
  for (const r of records) {
    if (!ids.has(r.mapping)) errors.push('Missing mapping: ' + r.id);
    if (!Number.isInteger(r.amountCents) || r.amountCents < 0)
      errors.push('Invalid amount: ' + r.id);
  }
  for (const d of Object.values(decisions)) {
    if (!ids.has(d.mapping)) errors.push('Unknown decision mapping: ' + d.mapping);
    if (!d.reason.trim() || !d.actor.trim()) errors.push('Missing review provenance: ' + d.mapping);
    if (
      d.disposition === 'mapped' &&
      (!d.target || !catalog.concepts.some((c) => c.id === d.target && !c.deprecated))
    )
      errors.push('Invalid reviewed target: ' + d.mapping);
  }
  return errors;
}
