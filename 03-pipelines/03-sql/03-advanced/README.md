# 03 · Advanced / Avanzado

| Query / Consulta | Why it matters / Qué demuestra |
| --- | --- |
| [01-monthly-windows.sql](01-monthly-windows.sql) | Calendar filling, LAG, explicit ROWS frame, NULL-safe growth / meses completos, mes anterior, acumulados y división segura |
| [02-prioritize-impact.sql](02-prioritize-impact.sql) | Multi-stage CTE, joins, DENSE_RANK vs ROW_NUMBER, exposure share / prioridades, desempates y peso económico |
| [03-taxonomy-spend.sql](03-taxonomy-spend.sql) | Recursive CTE and EXISTS prevent double-counting along multiple paths / recorrer jerarquías sin duplicar compras |
| [04-deduplicate-events.sql](04-deduplicate-events.sql) | Latest event per mapping with deterministic timestamp ties / último evento con desempate estable |
| [05-review-transaction.sql](05-review-transaction.sql) | Bound upsert and savepoint; caller rolls back a failed batch / actualización vinculada, savepoint y rollback |

EN: tests include missing months, zero denominators, equal ranks, timestamp ties, multi-path taxonomy, failed FK batches and retired review targets. [Indexes](../indexes.sql) and EXPLAIN show an indexed lookup with the same answer. This is local evidence, not proof of warehouse-scale throughput or distributed execution.

ES: se verifican meses ausentes, denominadores cero, empates, jerarquías con varios caminos, lotes con FK inválida y destinos retirados. Índices y EXPLAIN demuestran una búsqueda indexada con igual resultado, no rendimiento a escala de un warehouse distribuido.

[Level matrix / Matriz](../README.es.md) · [Observed checks / Comprobaciones](../../../05-validation/06-sql/report.json)
