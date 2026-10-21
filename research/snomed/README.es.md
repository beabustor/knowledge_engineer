# SNOMED CT: plan de investigación con terminología licenciada

[English](README.md) · [Español](README.es.md)

**Desactivado. No contiene corpus SNOMED CT.** No se ha verificado la cifra de
«dos millones de documentos»: SNOMED CT es una terminología versionada de
conceptos, descripciones, relaciones y conjuntos de referencia, habitualmente RF2.
Filas, descripciones, versiones y documentos clínicos no son recuentos equivalentes.
Los documentos de pacientes serían otro dataset con permisos y privacidad propios.

1. **Derechos y fuente:** consultar canales de licencia/distribución de
   [SNOMED International](https://www.snomed.org/) y el centro nacional aplicable.
   Identificar edición, territorio, condiciones y usos de IA permitidos. No dar
   por autorizadas extracción, API externas, entrenamiento ni redistribución.
   Completar el manifiesto de derechos específico antes de ingerir.
2. **Inventario:** obtener RF2 autorizado, registrar edición, checksum, origen,
   licencia y recuentos activos/inactivos de conceptos, descripciones y relaciones.
   Conservar instantáneas inmutables restringidas.
3. **Normalización:** preservar SCTID, conjuntos de idioma, aceptabilidad, fechas,
   módulos, tipos de relación y actividad. Separar ediciones/extensiones y guardar
   procedencia de cada registro normalizado.
4. **Etiquetas:** derivar tareas autorizadas: término→concepto, ranking de sinónimos,
   predicción de padres/tipos y extracción de relaciones. No convertir descripciones
   en supuestos documentos independientes ni relaciones no registradas en negativos.
5. **Línea base primero:** medir búsqueda léxica/grafo y, si se permite, embeddings
   y generación con recuperación antes de un LLM propio. RAG no evita licencias.
   La transformación OWL/RF2 debe conservar semántica.
6. **Dataset:** esquema posible `id, input, target_ids, source_edition,
   source_record_ids, task, split, review_status`. Separar por conceptos/familias
   y versiones cuando proceda para evitar fugas entre sinónimos o ediciones.
   Evaluar con negativos difíciles, revisión experta, ambigüedad, negación,
   conceptos obsoletos y cobertura multilingüe.
7. **Piloto de entrenamiento solo autorizado:** elegir modelo base con términos
   compatibles, registrar licencias y presupuesto. Empezar por ajuste pequeño y
   reproducible (por ejemplo, adaptación eficiente de parámetros), sin prometer
   entrenar un modelo fundacional a partir de un recuento de filas. Medir acierto,
   abstención, calibración y memorización; no inferir capacidad diagnóstica.
8. **Escala:** puntos de control, linaje, costes, evaluación aislada, análisis de
   extracción/memorización, borrado y permisos. Ampliar cómputo requiere decisiones
   de capacidad y presupuesto medidas; no se inicia automáticamente.
9. **Publicación separada:** datasets, embeddings, ontologías y pesos pueden tener
   restricciones distintas. Obtener permisos por artefacto y publicar ficha del
   modelo, límites y evaluación donde proceda. No exponer contenido licenciado
   mediante demos o checkpoints públicos por defecto.

Esta carpeta no implementa importador RF2, entrenador, modelo ni trabajos cloud.
