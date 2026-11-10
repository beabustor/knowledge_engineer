# Evidencia de niveles SQL

[English](README.md) · [Proyecto](../../README.es.md) · [Informe ejecutable](../../05-validation/06-sql/report.json)

Este itinerario usa **las mismas 8.640 líneas de compra sintéticas, 288 correspondencias y dos versiones del catálogo**. Cada consulta responde a un problema de compras o calidad de datos. Es evidencia técnica, no una certificación automática del nivel de la autora.

| Nivel de la captura | Qué se ha implementado | Justificación y límite |
| --- | --- | --- |
| Sin experiencia | No es una competencia que implementar | El repositorio contiene SQL ejecutable y permite empezar por Básico. |
| Básico: consultas simples | [01-basic](01-basic/): parámetros, WHERE, ORDER BY, LIMIT | Inspeccionar departamento y producto sin interpolar entradas. |
| Intermedio: joins, agregaciones, subconsultas y diagnóstico | [02-intermediate](02-intermediate/): joins, SUM/COUNT, GROUP BY/HAVING, NOT EXISTS | Cuadrar totales por proveedor y localizar 30 correspondencias obsoletas que afectan a 900 líneas. El verificador reproduce y diagnostica un join que multiplica los importes por 96. |
| Avanzado: joins, ventanas y consultas complejas | [03-advanced](03-advanced/): LAG, SUM OVER, DENSE_RANK, ROW_NUMBER, CTE recursiva y por etapas, meses vacíos, deduplicación y transacciones | Priorizar exposición económica, comparar meses reales, recorrer jerarquías sin duplicar importes y revertir revisiones inválidas. Se verifican resultados y casos límite. |
| Experto: gran escala / producción, BigQuery / Snowflake / Redshift | [04-production-design](04-production-design/): plantillas por dialecto y diseño operativo | **Solo diseño, desactivado y sin ejecución en motores cloud.** No demuestra experiencia de producción, rendimiento a gran escala ni certificación sintáctica nativa. |

## Ejecutar sin coste de servicios

```sh
python 05-validation/06-sql/verify.py
```

Usa SQLite de la biblioteca estándar de Python, una base en memoria y JSON local congelado. Sin SDK cloud ni credenciales. El informe registra versión de SQLite, hashes de consultas, 14 comprobaciones semánticas y planes EXPLAIN. CI ejecuta el comando. Se documenta como itinerario técnico: **no añade controles al recorrido del cliente**.

## Modelo y granularidad

`schema.sql` separa proveedores, productos, compras, meses, conceptos versionados y revisiones. Una fila es una línea original de compra; los céntimos enteros permiten cuadrar importes sin errores de coma flotante. Una correspondencia antigua puede apuntar a un concepto retirado en v2: se mide ese desfase en lugar de impedirlo con una FK a una sola versión. Las decisiones revisadas sí tienen FK compuesta de versión/identificador.

## Cómo justificarlo en una entrevista

- Explicar por qué un join conserva o multiplica filas y cómo reconciliar importes.
- Mostrar por qué LAG necesita meses completos, un marco ROWS explícito y tratamiento del denominador cero.
- Diferenciar DENSE_RANK de ROW_NUMBER y justificar desempates deterministas.
- Explicar la CTE recursiva, la deduplicación de caminos y el uso de EXISTS.
- Demostrar rollback ante una segunda operación inválida, no solo escribir BEGIN/COMMIT.
- Interpretar un cambio de SCAN a SEARCH manteniendo los resultados. No presentarlo como un benchmark de gran escala.

Saber explicar, adaptar y depurar estas consultas es lo que permite defender un nivel avanzado. Tener los archivos no certifica el nivel. La experiencia experta de producción requiere operación real, volumen representativo, costes y evidencias adicionales.
