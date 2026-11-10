# SQL evidence / Evidencia SQL

Run from the root / Ejecutar desde la raíz:

```sh
python 05-validation/06-sql/verify.py
```

[Report / Informe](report.json) · [SQL levels / Niveles](../../03-pipelines/03-sql/README.es.md)

EN: 14 checks execute the actual SQLite queries against all 8,640 frozen synthetic purchase lines. Independent Python totals verify supplier and monthly aggregates. Mutation tests cover empty months, ties, duplicated hierarchy paths, foreign-key rollback and retired targets. The report records SQL hashes and EXPLAIN before/after an index. Cloud templates are hashed but never executed. No cloud or performance-at-scale claim.

ES: 14 comprobaciones ejecutan las consultas SQLite reales sobre las 8.640 líneas. Totales Python independientes verifican agregaciones mensuales y por proveedor. Se prueban meses vacíos, empates, caminos duplicados, rollback de FK y destinos retirados. El informe registra hashes y planes antes/después del índice. Las plantillas cloud solo se registran: nunca se ejecutan y no demuestran escala de producción.

`build_guide.py` executes queries and writes every saved output and EN/ES visual guide. `check_docs.py` compares committed outputs with fresh rows and SQL hashes. `test_guide_browser.py` checks the saved HTML views and captures documentary screenshots. / Generación, comprobación de salidas y vistas documentales verificadas.
