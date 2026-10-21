# María Moliner: plan de investigación de relaciones léxicas autorizadas

[English](README.md) · [Español](README.es.md)

**Desactivado. No se incluyen textos ni raspadores.** Comprar el diccionario o
acceder a una web no concede por sí solo permiso para extraer contenidos,
entrenar o redistribuir una base de relaciones. Identificar edición y titular y
obtener permiso adecuado o base legal aplicable documentada. No eludir accesos
ni asumir que cualquier excepción de minería se aplica o permite publicar.

1. **Derechos:** registrar por separado adquisición, extracción, almacenamiento,
   minería, procesamiento externo, entrenamiento y publicación. Resolver
   territorio, contratos, materiales de terceros y reservas de derechos.
2. **Fuente:** obtener edición procesable autorizada; registrar checksum, edición,
   identificadores de entradas/páginas y limitaciones del formato. Si el OCR es
   necesario y está autorizado, medir sus errores antes de producir etiquetas.
3. **Sentidos:** separar lema, categoría gramatical, flexión, IDs de acepción y uso.
   Homonimia (entradas/orígenes distintos) no equivale automáticamente a polisemia
   (sentidos relacionados). No aplanar todas las acepciones en un concepto.
4. **Relaciones candidatas:** sinonimia, antonimia, hiperonimia/hiponimia,
   meronimia/holonimia y relaciones de uso/dominio sustentadas por la fuente.
   Conservar dirección, referencia al fragmento, método, confianza y revisión.
   «Todas las relaciones posibles» es un objetivo, no garantía de exhaustividad.
5. **Revisión:** distinguir afirmaciones explícitas de inferencias del modelo.
   Validar muestras estratificadas y sentidos ambiguos; medir precisión, cobertura
   respecto de muestra anotada y acuerdo entre anotadores.
6. **Representación:** considerar OntoLex-Lemon para entradas/formas/sentidos y SKOS
   para esquemas conceptuales, conservando procedencia. La hiperonimia léxica no
   siempre es `rdfs:subClassOf`; sinonimia no implica `owl:sameAs`.
7. **Modelos solo si se permite:** comparar reglas y extracción supervisada; usar
   un modelo base con licencia compatible y etiquetas autorizadas pequeñas.
   Separar evaluación por entrada/sentido. Enviar a API externas exige permiso
   específico y condiciones de conservación aceptables.
8. **Escala:** lotes por ID estable, puntos de control, deduplicación, límites de
   API autorizadas, coste y calidad revisada. Mantener privados textos y derivados
   restringidos; definir borrado de índices y checkpoints.
9. **Publicación autorizada:** un grafo de relaciones puede seguir sujeto a derechos
   de autor, de bases de datos, contratos o licencia. Publicar dataset/pesos es
   otra decisión. Mantener ejemplos sintéticos públicos hasta resolver derechos.

No se implementan ingesta, extracción ni entrenamiento en esta carpeta.
