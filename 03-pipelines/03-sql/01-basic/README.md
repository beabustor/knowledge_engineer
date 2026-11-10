# 01 · Basic / Básico

EN: [01-filter.sql](01-filter.sql) uses bound parameters, WHERE, ORDER BY and LIMIT to inspect one product and department. It demonstrates safe query inputs and stable ordering. Verified against independently filtered source rows.

ES: parámetros vinculados, WHERE, ORDER BY y LIMIT para un producto y departamento. Se contrasta con las filas de origen filtradas de forma independiente. No se concatenan entradas del usuario.

[Level matrix / Matriz de niveles](../README.es.md) · [Executable evidence / Evidencia](../../../05-validation/06-sql/report.json)

## Query logic and saved output / Lógica y salidas guardadas

- [q01: explicación, SQL y resultado](../VISUAL-GUIDE.es.md#q01) · [English](../VISUAL-GUIDE.md#q01)

Every `.sql` query in this folder has a same-name `.output.json` from actual SQLite execution. / Cada consulta tiene un `.output.json` con el mismo nombre y resultados SQLite reales.
