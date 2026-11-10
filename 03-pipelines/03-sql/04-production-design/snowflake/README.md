# snowflake

**Design only / Solo diseño. Not run or native-validated / Sin ejecución ni validación nativa.**

Use an operator-managed warehouse with auto-suspend, statement timeout and resource monitor. Inspect Query Profile and partition pruning before deciding whether clustering is worth its maintenance cost. The template does not enable automatic clustering or create a warehouse. Bind `?` dates through the connector. / Warehouse gestionado por el operador, suspensión y límites; revisar poda y coste de clustering. No se crea warehouse ni se activa clustering.

[Template / Plantilla](example.sql) · [Required controls / Controles necesarios](../README.md)

[Saved expected output / Salida esperada guardada](example.expected.json): computed with a SQLite equivalent, **not native snowflake execution**. / Referencia local, no ejecución nativa.
