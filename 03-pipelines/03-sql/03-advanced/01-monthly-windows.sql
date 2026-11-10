-- Zero-filled supplier/month matrix makes LAG mean previous calendar month.
WITH monthly AS (
 SELECT m.supplier_id, p.month, SUM(p.amount_cents) AS amount_cents
 FROM purchase AS p JOIN product_mapping AS m ON m.id = p.mapping_id
 GROUP BY m.supplier_id, p.month
), filled AS (
 SELECT s.id AS supplier_id, d.month, COALESCE(m.amount_cents,0) AS amount_cents
 FROM supplier AS s CROSS JOIN dim_month AS d
 LEFT JOIN monthly AS m ON m.supplier_id = s.id AND m.month = d.month
), windowed AS (
 SELECT supplier_id, month, amount_cents,
        LAG(amount_cents) OVER(PARTITION BY supplier_id ORDER BY month) AS previous_cents,
        SUM(amount_cents) OVER(PARTITION BY supplier_id ORDER BY month
                              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_cents
 FROM filled
)
SELECT supplier_id, month, amount_cents, previous_cents,
       amount_cents - previous_cents AS delta_cents,
       CASE WHEN previous_cents IS NULL OR previous_cents=0 THEN NULL
            ELSE 100.0 * (amount_cents-previous_cents)/previous_cents END AS growth_pct,
       running_cents
FROM windowed ORDER BY supplier_id, month;
