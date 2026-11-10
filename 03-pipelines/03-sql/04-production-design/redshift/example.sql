-- DESIGN TEMPLATE ONLY. No cluster, serverless workgroup, IAM role or COPY job is provisioned.
-- Validate distribution/skew against actual volume, not the 8,640-row teaching fixture.
CREATE TABLE IF NOT EXISTS procurement.purchase (
 id VARCHAR(40), mapping_id VARCHAR(40), department VARCHAR(80),
 purchased_on DATE, amount_cents BIGINT
) DISTSTYLE AUTO SORTKEY(purchased_on, mapping_id);

WITH monthly AS (
 SELECT mapping_id, DATE_TRUNC('month', purchased_on)::DATE AS month,
        SUM(amount_cents) AS amount_cents
 FROM procurement.purchase
 WHERE purchased_on >= %s AND purchased_on < %s
 GROUP BY mapping_id, DATE_TRUNC('month', purchased_on)::DATE
)
SELECT *, SUM(amount_cents) OVER (
 PARTITION BY mapping_id ORDER BY month
 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
) AS running_cents
FROM monthly ORDER BY mapping_id, month;
-- %s represents driver parameter binding, not Python string interpolation.
