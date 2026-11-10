-- CTEs isolate release drift, aggregate at mapping grain, then rank by financial exposure.
WITH inactive AS (
 SELECT m.id,m.supplier_id,m.target
 FROM product_mapping AS m
 LEFT JOIN concept AS c ON c.version=:release AND c.id=m.target
 WHERE c.id IS NULL OR c.deprecated=1
), exposure AS (
 SELECT i.id,i.supplier_id,i.target,COUNT(*) AS affected_lines,
        SUM(p.amount_cents) AS affected_cents
 FROM inactive AS i JOIN purchase AS p ON p.mapping_id=i.id
 GROUP BY i.id,i.supplier_id,i.target
)
SELECT *,
 DENSE_RANK() OVER(ORDER BY affected_cents DESC) AS global_priority,
 ROW_NUMBER() OVER(PARTITION BY supplier_id ORDER BY affected_cents DESC,id) AS supplier_priority,
 1.0 * affected_cents / NULLIF(SUM(affected_cents) OVER(),0) AS exposure_share
FROM exposure ORDER BY affected_cents DESC,id;
