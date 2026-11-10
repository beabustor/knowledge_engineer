-- DESIGN TEMPLATE ONLY. No runner executes this file. Requires a real billed project.
-- Replace your_project; select dataset location, quotas and byte caps before execution.
CREATE TABLE IF NOT EXISTS `your_project.procurement.purchase` (
 id STRING, mapping_id STRING, department STRING, purchased_on DATE, amount_cents INT64
)
PARTITION BY DATE_TRUNC(purchased_on, MONTH)
CLUSTER BY mapping_id, department
OPTIONS(require_partition_filter = TRUE);

-- Named DATE parameters; inspect dry-run bytes before issuing a real query.
WITH monthly AS (
 SELECT mapping_id, DATE_TRUNC(purchased_on, MONTH) AS month,
        SUM(amount_cents) AS amount_cents
 FROM `your_project.procurement.purchase`
 WHERE purchased_on >= @start_date AND purchased_on < @end_date
 GROUP BY mapping_id, month
)
SELECT *, SUM(amount_cents) OVER (
 PARTITION BY mapping_id ORDER BY month
 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
) AS running_cents
FROM monthly ORDER BY mapping_id, month;
