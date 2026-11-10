-- Anti-semi join: only mappings whose target is absent or retired in the new release.
SELECT m.id, m.supplier_id, m.target,
       COUNT(p.id) AS affected_lines, SUM(p.amount_cents) AS affected_cents
FROM product_mapping AS m
JOIN purchase AS p ON p.mapping_id = m.id
WHERE NOT EXISTS (
 SELECT 1 FROM concept AS c
 WHERE c.version = :release AND c.id = m.target AND c.deprecated = 0
)
GROUP BY m.id, m.supplier_id, m.target
ORDER BY affected_cents DESC, m.id;
