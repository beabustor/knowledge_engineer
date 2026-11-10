# redshift

**Design only / Solo diseño. Not run or native-validated / Sin ejecución ni validación nativa.**

DISTSTYLE AUTO avoids an unmeasured distribution-key claim on a tiny fixture. Validate sort-key effectiveness, skew, redistribution and spill with actual EXPLAIN and runtime/system views under representative concurrency. Bind `%s` dates using the driver, never string interpolation. No cluster/workgroup or COPY load is created. / Validar distribución, sesgo, orden y derrames con volumen real; parámetros vinculados, sin provisión automática.

[Template / Plantilla](example.sql) · [Required controls / Controles necesarios](../README.md)
