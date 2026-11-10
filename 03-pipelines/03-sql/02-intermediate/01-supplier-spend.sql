-- Many purchase rows -> one mapping -> one supplier. No amount is duplicated.
SELECT s.id AS supplier_id, s.name,
       COUNT(*) AS purchase_lines, SUM(p.amount_cents) AS amount_cents
FROM purchase AS p
JOIN product_mapping AS m ON m.id = p.mapping_id
JOIN supplier AS s ON s.id = m.supplier_id
GROUP BY s.id, s.name
HAVING SUM(p.amount_cents) > :minimum_cents
ORDER BY amount_cents DESC, s.id;
