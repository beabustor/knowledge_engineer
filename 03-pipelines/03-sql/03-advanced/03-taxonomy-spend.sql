-- UNION deduplicates ancestor pairs; EXISTS avoids multiplying a purchase along multiple paths.
WITH RECURSIVE ancestors(child,ancestor) AS (
 SELECT id,id FROM concept WHERE version=:release AND deprecated=0
 UNION
 SELECT a.child,b.parent FROM ancestors AS a
 JOIN broader AS b ON b.child=a.ancestor AND b.version=:release
 JOIN concept AS c ON c.id=b.parent AND c.version=:release AND c.deprecated=0
)
SELECT COUNT(*) AS purchase_lines, COALESCE(SUM(p.amount_cents),0) AS amount_cents
FROM purchase AS p JOIN product_mapping AS m ON m.id=p.mapping_id
WHERE EXISTS(SELECT 1 FROM ancestors AS a WHERE a.child=m.target AND a.ancestor=:category);
