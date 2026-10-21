# 02-impact-scenario

[Repository / Repositorio](../../README.md) · [Execution / Ejecución](../../09-docs/EXECUTION.md)

**EN.** Frozen original procurement scenario: two catalogs, 288 mappings and 8,640 purchase rows.

**ES.** Caso propio congelado: dos catálogos, 288 correspondencias y 8.640 filas de compra.

## Contents / Contenido

01. [catalog-v1.json](catalog-v1.json)
02. [catalog-v2.json](catalog-v2.json)
03. [manifest.json](manifest.json)
04. [mappings.json](mappings.json)
05. [records.json](records.json)

## Reproduce / Reproducir

`python 03-pipelines/01-impact/generate.py` from the root / desde la raíz.

EN: `records.json` stores a `columns` schema and ordered `rows` to reduce mobile download/parse size. The engine reconstructs named purchase objects. Amounts are integer synthetic EUR cents; there are no real supplier transactions or official ontology release changes. Checksums are recorded in `manifest.json`.

ES: `records.json` contiene `columns` y filas `rows` ordenadas para reducir descarga y análisis en móvil. El motor reconstruye objetos con nombres de campo. Los importes son céntimos EUR sintéticos; no son transacciones reales ni cambios oficiales de ontología. `manifest.json` registra checksums.
