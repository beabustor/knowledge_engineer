/** One bounded business case; the larger fixture stays an independent regression dataset. */
import {
  baseline,
  updated,
  mappings,
  records,
  stateOf,
  type Catalog,
  type Decisions,
} from './engine.ts';
export { baseline, updated };
export type Material = 'nitrile' | 'latex';
export const caseMappings = mappings.filter((m) => m.target === 'ProtectiveGlove');
const ids = new Set(caseMappings.map((m) => m.id));
export const caseRecords = records.filter((r) => ids.has(r.mapping));
export const targetFor: Record<Material, string> = { nitrile: 'NitrileGlove', latex: 'LatexGlove' };
export function caseSummary(catalog: Catalog, decisions: Decisions = {}) {
  const states = new Map(caseMappings.map((m) => [m.id, stateOf(m, catalog, decisions)]));
  const groups = new Map<string, { id: string; count: number; amountCents: number }>();
  for (const r of caseRecords) {
    const s = states.get(r.mapping)!;
    const id = s.status === 'valid' ? s.target! : s.status;
    const row = groups.get(id) ?? { id, count: 0, amountCents: 0 };
    row.count++;
    row.amountCents += r.amountCents;
    groups.set(id, row);
  }
  return {
    rows: [...groups.values()].sort((a, b) => a.id.localeCompare(b.id)),
    total: caseRecords.length,
    totalCents: caseRecords.reduce((sum, r) => sum + r.amountCents, 0),
    pending: caseRecords.filter((r) => states.get(r.mapping)!.status === 'unresolved').length,
    reviewed: caseMappings.filter((m) => Boolean(decisions[m.id])).length,
    materialCorrect: caseMappings.every(
      (m) => stateOf(m, catalog, decisions).target === targetFor[m.attributes.material as Material],
    ),
  };
}
export function reviewMaterial(
  decisions: Decisions,
  material: Material,
  target: string,
  at = new Date().toISOString(),
): Decisions {
  if (target !== targetFor[material])
    throw new Error('Target does not match the supplier material');
  const result = { ...decisions };
  for (const m of caseMappings.filter((m) => m.attributes.material === material)) {
    if (!updated.concepts.some((c) => c.id === target && !c.deprecated))
      throw new Error('Target is not active');
    result[m.id] = {
      mapping: m.id,
      disposition: 'mapped',
      target,
      reason: `Demo reviewer confirmed supplier material ${material}; applies to this product only.`,
      actor: 'demo-reviewer',
      at,
    };
  }
  return result;
}
export const caseReportSQL = `-- Scope: the six glove SKUs in the guided case, not the full dataset.
SELECT CASE WHEN m.status='valid' THEN m.target ELSE m.status END AS category,
       COUNT(*) AS purchase_lines,
       SUM(p.amount_cents) AS amount_cents
FROM purchase p JOIN mapping m ON p.mapping_id=m.id
WHERE m.id IN (${caseMappings.map((m) => `'${m.id}'`).join(', ')})
GROUP BY category ORDER BY category;`;
