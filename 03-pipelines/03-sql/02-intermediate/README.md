# 02 · Intermediate / Intermedio

- [01-supplier-spend.sql](01-supplier-spend.sql): many-to-one joins, GROUP BY, SUM/COUNT and HAVING. Reconciles all 8,640 fact rows and every cent. / Joins muchos-a-uno y agregaciones que conservan las 8.640 filas y sus importes.
- [02-review-queue.sql](02-review-queue.sql): NOT EXISTS subquery identifies targets absent or retired in a specific release. / Subconsulta que encuentra destinos ausentes o retirados de una versión concreta.

EN: troubleshooting is demonstrated in the verifier: an incorrect join at supplier grain multiplies spend 96 times; the corrected join reconciles to source totals. Never repair fan-out with SUM(DISTINCT amount): equal amounts may be different purchases.

ES: el verificador reproduce un join incorrecto por proveedor que multiplica por 96 y comprueba la corrección con totales originales. No arreglarlo con SUM(DISTINCT importe): dos compras distintas pueden tener el mismo importe.

[Matrix / Matriz](../README.es.md) · [Verifier / Verificador](../../../05-validation/06-sql/verify.py)
