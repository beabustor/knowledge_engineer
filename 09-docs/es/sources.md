# Fuentes, derechos y procedencia

[English](../en/sources.md)

El catálogo activo contiene textos propios MIT y enlaces a identificadores de
referencia. No es una edición terminológica oficial ni completa. Las frases
sintéticas de evaluación son CC0-1.0. Los resultados externos conservan las
condiciones de su fuente: acceder no concede redistribución ilimitada.

El Excel CIE-10 de terceros no tenía permisos de redistribución verificados.
Se retiró de la versión actual y del sitio generado, conservando procedencia
para auditoría. **Permanece en commits antiguos**: borrar el archivo actual no
elimina blobs históricos. Una limpieza completa necesita reescritura coordinada
del historial; no se ha realizado ni se presenta como resuelta.

En futuras importaciones registrar fuente, edición, licencia, checksum,
transformaciones, idioma y revisión de correspondencias. No llamar equivalencia
a una coincidencia textual. No se incluyen, ingieren ni entrenan corpus SNOMED CT
o María Moliner. `08-research/` contiene planes condicionales, no permisos ni modelos.

`05-validation/03-integration/live-report.json` prueba solo las consultas Wikidata/ChEBI/HPO/OLS/NLM/CIMA y el momento
registrados. No demuestra disponibilidad permanente, acceso ilimitado, corrección
clínica ni autorización para republicar catálogos completos.

## Servicios públicos conectados

| Conector | Referencia | Alcance y condiciones |
| --- | --- | --- |
| Wikidata | [API de entidades](https://www.wikidata.org/w/api.php) · [CC0](https://www.wikidata.org/wiki/Wikidata:Licensing) | Entidades generales; búsqueda EN/ES. Datos estructurados CC0; sin traducciones inventadas. |
| ChEBI | [OLS](https://www.ebi.ac.uk/ols4/api/search?q=water&ontology=chebi&rows=5) · [ChEBI](https://www.ebi.ac.uk/chebi/) | Sustancias químicas; filtro de ontología. Etiquetas originales y condiciones de la fuente. |
| HPO | [OLS](https://www.ebi.ac.uk/ols4/api/search?q=cough&ontology=hp&rows=5) · [HPO](https://hpo.jax.org/) | Fenotipos; filtro de ontología. Conservar condiciones y atribución HPO. No son reglas diagnósticas. |
| OLS | [EMBL-EBI](https://www.ebi.ac.uk/ols4/) | Búsqueda general de ontologías, conservando su procedencia. |
| ICD-10-CM | [NLM Clinical Tables](https://clinicaltables.nlm.nih.gov/apidoc/icd10cm/v3/doc.html) | **Adaptación clínica estadounidense, en inglés**. No es la CIE-10 base OMS ni CIE-10-ES. Versión actual del servicio sin fijar; sin equivalencias entre ediciones. Condiciones NLM/CMS. |
| CIMA | [API AEMPS](https://cima.aemps.es/cima/resources/docs/CIMA_REST_API.pdf) | Registros de medicamentos españoles; no clasifica sustancias ni enfermedades. Condiciones AEMPS. |

Las búsquedas anónimas no requieren clave API ni suscripción de IA de pago. Cada proveedor controla su disponibilidad y cuotas: gratuito no significa ilimitado. La demo limita conjuntamente a **6/minuto y 30/24 h por navegador**, una simultánea, cinco resultados y caché acotada en memoria. El proxy opcional admite las mismas fuentes y permanece desactivado. No se consulta automáticamente al cargar la página ni al escribir.

### Flujo de anotación del texto

1. Escribe una frase de hasta 100 caracteres.
2. En **Conecta tu texto con conocimiento público**, indica un fragmento de esa frase, elige fuente y escribe un término de búsqueda. Puedes vincular un fragmento español a una búsqueda inglesa; la aplicación no inventa traducciones.
3. Recupera identificadores y descripciones candidatos. Se envía solo el término de búsqueda, no la frase separada ni la revisión.
4. Acepta, rechaza o deja pendiente cada anotación. Aceptar registra tu criterio **solo para esta frase**. Rechazar elimina el enlace candidato, conservando estado e identificador para inspección.
5. Inspecciona grafo, RDF/OWL, Cypher y SQL. Los individuos `TextAnnotation` conservan evidencia, polaridad de negación simple y revisión. `skos:prefLabel` / `skos:altLabel` representan etiquetas; `prov:wasDerivedFrom` y las fechas conservan procedencia. No se infieren `owl:sameAs` ni `owl:equivalentClass`. La búsqueda no importa masivamente jerarquías ni afirmaciones de las ontologías.
6. Cambiar la frase borra resultados y revisiones. Solo persisten las fechas de cuota: no es una base compartida de anotaciones ni un sistema de entrenamiento.

SNOMED CT y María Moliner siguen desactivados hasta contar con los permisos correspondientes. El conector NLM anónimo no suplanta APIs OMS con autenticación. SKOS y PROV-O son estándares de representación, no catálogos remotos.

La verificación separa HTTP real de pruebas de navegador con respuestas simuladas. En este ejecutor, Chromium real encuentra `ERR_CERT_AUTHORITY_INVALID` con la CA del proxy del entorno. No se ha desactivado TLS. Se conserva el fallo en `05-validation/03-integration/browser-live-report.json`; no se afirma que la prueba real de navegador haya pasado.
