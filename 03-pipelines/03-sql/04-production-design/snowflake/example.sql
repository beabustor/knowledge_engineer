-- DESIGN TEMPLATE ONLY. No account, warehouse, task or billed query is created by this repo.
-- Requires operator-chosen database/schema/role and warehouse limits.
CREATE TABLE IF NOT EXISTS procurement.purchase (
 id VARCHAR, mapping_id VARCHAR, department VARCHAR,
 purchased_on DATE, amount_cents NUMBER(38,0)
);
-- Automatic clustering is deliberately NOT enabled. Inspect pruning and query profile first.
-- Bind dates via the connector; do not interpolate untrusted text into SQL.
WITH monthly AS (
 SELECT mapping_id, DATE_TRUNC('MONTH', purchased_on)::DATE AS month,
        SUM(amount_cents) AS amount_cents
 FROM procurement.purchase
 WHERE purchased_on >= ? AND purchased_on < ?
 GROUP BY mapping_id, DATE_TRUNC('MONTH', purchased_on)::DATE
)
SELECT *, SUM(amount_cents) OVER (
 PARTITION BY mapping_id ORDER BY month
 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
) AS running_cents
FROM monthly ORDER BY mapping_id, month;
