# Evaluation / Evaluación

## English

60 author-created, CC0-1.0 synthetic phrases: 12 development and 48 frozen test
cases. `manifest.json` records the pre-evaluation checksum. No alias/rule changes
were made to fit test failures. This is **not an independent clinical benchmark**:
labels were authored for this project and await the user's terminology review.
Dev/test wording separation does not imply concept-family independence.

Run `node evaluation/run.ts`. `report.json` includes every prediction and failure.
The task is signed concept retrieval (positive/negative mentions), not diagnosis.
Micro precision/recall/F1 score `(concept_id, polarity)` pairs. Exact accuracy
requires all and only expected pairs. Candidate recall@5 ignores polarity and
uses current catalog order (there is no learned ranker). Negation accuracy covers
retrieved gold concepts only. Abstention accuracy covers empty-gold cases only;
out-of-catalog findings do not count as successful clinical understanding.
Latency is one local run, not a production SLA; reruns vary.

Known failures include negation after a term, "not only", and misspellings.
Inspect these failures rather than add per-case patches. For a new algorithm,
tune on development data and evaluate on a new held-out version after inspecting
these test results. Real generalization needs independently sampled and reviewed
material, including a larger no-match set and additional languages/domains.

### Terminology review

Open `review.csv`, keep IDs/text fixed and mark `review_decision` as `accept`,
`correct` or `uncertain`. Record reviewer and notes; propose changed concept IDs
or polarity in notes. Do not silently edit the frozen labels. Reviewed corrections
become a versioned successor with a new checksum and old reports preserved.
Terminology review is not clinical deployment approval.

## Español

60 frases sintéticas propias, CC0-1.0: 12 de desarrollo y 48 de prueba congeladas.
`manifest.json` fija el checksum anterior a la evaluación. No se han retocado
alias/reglas para pasar los fallos. **No es un benchmark clínico independiente**:
las etiquetas son del autor y esperan tu revisión terminológica. Separar frases
no garantiza independencia entre familias de conceptos.

Ejecutar `node evaluation/run.ts`. `report.json` incluye predicciones y errores.
Se evalúan pares `(concepto, polaridad)`, no diagnósticos. Precisión, cobertura y
F1 son micro; exactitud exige todos y solo los pares esperados. Recall@5 ignora
polaridad y usa orden de catálogo, sin ranker aprendido. La negación se mide solo
en conceptos esperados recuperados. Abstención se mide en casos sin etiquetas;
no reconocer un hallazgo fuera del catálogo no demuestra comprensión clínica.
La latencia es una ejecución local, no un SLA.

Hay fallos de negación posterior, "no solo" y erratas. No corregirlos uno a uno
para inflar esta prueba: desarrollar con el conjunto dev y preparar una versión
retenida nueva tras inspeccionar estos resultados. La generalización necesita
material independiente y revisión, más casos sin correspondencia y otros dominios.

### Tu revisión

Abrir `review.csv`; mantener IDs/textos y marcar `review_decision`: `accept`,
`correct` o `uncertain`. Añadir revisor y notas con propuestas de corrección.
No cambiar silenciosamente las etiquetas congeladas. Las correcciones revisadas
formarán otra versión con checksum nuevo y conservación de informes anteriores.
Revisión terminológica no equivale a aprobación para uso clínico.
