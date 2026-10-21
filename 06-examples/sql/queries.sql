-- Ambiguous terms: multiple conceptual senses.
SELECT term, group_concat(concept_id) AS senses
FROM term_sense GROUP BY term, language HAVING count(*) > 1;

-- Transitive conceptual hierarchy (hypernymy). UNION prevents cycles looping.
WITH RECURSIVE ancestors(child, parent) AS (
  SELECT child, parent FROM is_a
  UNION
  SELECT a.child, i.parent FROM ancestors a JOIN is_a i ON a.parent = i.child
)
SELECT child, parent FROM ancestors ORDER BY child, parent;
