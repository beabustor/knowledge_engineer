# 04 · Production design / Diseño de producción

**EN: not executed or production-validated. ES: no ejecutado ni validado en producción.**

[config.example.json](config.example.json) has `enabled: false` and `automatic_execution: false`. No code loads this configuration to create services or run queries. The local verifier hashes these SQL files for traceability; it never executes them.

El verificador local registra los hashes, pero nunca ejecuta estas plantillas ni crea servicios. Los dialectos cloud no se validan mediante SQLite.

| Target / Destino | Design / Diseño |
| --- | --- |
| [BigQuery](bigquery/) | Monthly partitions, clustering and required date filters; dry-run bytes and maximum bytes billed / particiones, filtros y límite de bytes |
| [Snowflake](snowflake/) | Bounded date queries; micro-partition pruning, query profile, warehouse auto-suspend and resource monitors / consultas acotadas, perfil y límites operativos |
| [Redshift](redshift/) | DISTSTYLE AUTO and date-leading sort key; inspect skew, redistribution, WLM and spill / distribución, ordenación, colas y derrames |

## Before any real run / Antes de ejecutar

1. Select account, region, least-privilege role and approved budget. / Elegir cuenta, región, rol mínimo y presupuesto.
2. Reconcile a synthetic load: IDs, counts, cents, nulls and duplicate keys. Do not assume PK/FK enforcement transfers from SQLite. / Conciliar datos y no asumir que se aplican las mismas restricciones.
3. Validate syntax with the actual engine and driver binding. No secrets in SQL or repository. / Validar dialecto y vinculación con el motor real; sin secretos en el repo.
4. Start with bounded queries and cost/timeout guards; inspect native profiles. / Consultas acotadas, límites y perfiles nativos.
5. Load representative volume, skew and concurrency. Record bytes/credits/RPU or node time, row reconciliation and p50/p95. / Medir volumen, sesgo, concurrencia, costes y resultados.
6. Define retries, idempotent incremental loads, schema evolution, audit, access controls, monitoring and recovery before production. / Definir reintentos, cargas incrementales idempotentes, evolución, auditoría, accesos y recuperación.

The provided templates cover only schema and bounded analytics design. The operational controls and ingestion pipeline above are requirements, not implemented services. / Las plantillas cubren esquema y consultas acotadas; los controles e ingesta anteriores son requisitos pendientes, no servicios implementados.

This stage prepares an expert-level discussion; it cannot substantiate expert production experience. / Prepara la conversación técnica, no acredita experiencia experta en producción.
