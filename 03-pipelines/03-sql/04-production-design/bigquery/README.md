# bigquery

**Design only / Solo diseño. Not run or native-validated / Sin ejecución ni validación nativa.**

Monthly DATE partitions with `require_partition_filter`, clustering and named DATE parameters. Before running: verify dataset location, use a dry run, cap maximum bytes billed and select a bounded date range. No project, dataset or billed job is created automatically. / Particiones mensuales, filtros obligatorios y parámetros DATE. Comprobar región, dry run, bytes máximos y fechas; sin creación automática.

[Template / Plantilla](example.sql) · [Required controls / Controles necesarios](../README.md)

[Saved expected output / Salida esperada guardada](example.expected.json): computed with a SQLite equivalent, **not native bigquery execution**. / Referencia local, no ejecución nativa.
