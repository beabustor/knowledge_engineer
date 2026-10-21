-- Input: temporary observed(id, positive, negative), populated with bound parameters.
SELECT c.id, l.label,
       SUM(COALESCE(o.positive, 0)) - 2 * SUM(COALESCE(o.negative, 0)) AS score
FROM concept c
JOIN concept_label l ON l.concept_id = c.id AND l.language = :lang
JOIN disease_symptom ds ON ds.disease_id = c.id
LEFT JOIN observed o ON o.id = ds.symptom_id
GROUP BY c.id, l.label
HAVING SUM(COALESCE(o.positive, 0)) > 0
ORDER BY score DESC, c.id;
