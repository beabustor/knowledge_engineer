-- Business question: inspect glove lines reported by the Research department.
SELECT p.id, p.month, p.quantity, p.amount_cents
FROM purchase AS p
WHERE p.department = :department
  AND p.mapping_id = :mapping_id
ORDER BY p.month, p.id
LIMIT :row_limit;
