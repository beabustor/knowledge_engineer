# Preparación de investigación — sin ingesta ni entrenamiento

[English](README.md) · [Español](README.es.md)

| Fuente | Guía | Estado |
| --- | --- | --- |
| SNOMED CT | [Plan paso a paso](snomed/README.es.md) | Sin archivos fuente, ingesta ni entrenamiento |
| María Moliner | [Plan paso a paso](maria-moliner/README.es.md) | Sin texto, scraping ni extracción de relaciones |

Las guías explican posibilidades técnicas, no concluyen que una licencia concreta
las permita. Revisar por separado adquisición, extracción, minería de textos/datos,
almacenamiento, envío a modelos externos, entrenamiento, publicación de datasets
y publicación de pesos. Poder leer una obra no implica necesariamente esos otros
permisos. Importan territorio, edición, contratos, materiales de terceros y ley
aplicable. Registrar decisiones autorizadas con el titular/licenciante y revisión
cualificada cuando corresponda.

`common/rights-review.example.json` empieza pendiente con todos los permisos falsos.
`common/prepare.py` comprueba campos y devuelve un plan: no concede derechos,
autentica revisores, ingiere documentos ni entrena. Un manifiesto local aprobado
no es una licencia ni un mecanismo de control de acceso de producción. No se
incluyen raspadores ni entrenadores.

Mantener datos y resultados fuera de Git, en almacenamiento privado autorizado.
Las carpetas locales `08-research/<fuente>/data/` y `outputs/` están ignoradas.
No enviar textos restringidos a API de modelos alojados sin permiso expreso y
condiciones aceptables de conservación/uso. La licencia MIT del repositorio se
aplica al código, no a corpus, terminologías, diccionario ni derivados restringidos.
