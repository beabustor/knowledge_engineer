# Knowledge engineer: del lenguaje al grafo de conocimiento

[English](README.md) · [Español](README.es.md)

**[Probar demo →](https://beabustor.github.io/knowledge_engineer/)** · Disponible al activar GitHub Pages; instrucciones de publicación al final.

Ejemplo educativo para representar conocimiento médico y léxico en JSON,
Python, TypeScript, SQL, RDF/OWL y Neo4j, y recuperar enfermedades candidatas
a partir de descripciones en inglés o español. Requiere Python 3.10+ y, para
TypeScript, Node.js 22.18+. No es necesario instalar dependencias.

**El modelo clínico original y el caso de personas/acciones son sintéticos.**
El explorador añade un catálogo reducido de identificadores de referencia
CIE-10/ChEBI con etiquetas locales. No incluye contenidos de SNOMED CT ni
del diccionario María Moliner. Los resultados son candidatos educativos, no
diagnósticos ni probabilidades; no deben usarse para decisiones clínicas.

## Inicio rápido

Ejecutar desde la raíz del repositorio. `--lang` selecciona el idioma de salida;
la entrada puede estar en cualquiera de los dos idiomas. Por defecto se usa `es`.

```sh
python python/demo.py --lang en "I have fever, cough and sore throat"
python python/demo.py --lang es "Tengo cefalea y náuseas, pero sin fiebre"
node typescript/demo.ts --lang es "Cefalea y náuseas, pero sin fiebre"
python sql/demo.py --lang es "Cefalea y náuseas, pero sin fiebre"
```

Añadir `--json` para obtener resultados procesables. Las claves JSON, los IDs de
conceptos, los identificadores de código y las relaciones de base de datos se
mantienen en inglés para facilitar la interoperabilidad. Las etiquetas y las
explicaciones para personas se traducen. Los comentarios del código usan inglés.

## Tecnologías y carpetas

| Carpeta | Tecnología | Función |
| --- | --- | --- |
| `data/` | JSON | Conceptos sintéticos, asociaciones y términos bilingües comunes |
| `locales/` | JSON (`en`, `es`) | Etiquetas de conceptos y mensajes traducidos compartidos |
| `python/` | Python | Extracción léxica, ranking explicable y exportadores |
| `typescript/` | TypeScript / Node.js | Implementación independiente de extracción y ranking |
| `sql/` | SQL / SQLite | Modelo relacional, ranking por agregación y jerarquía recursiva |
| `rdf/` | RDF / RDFS / OWL (Turtle) | Representación semántica y restricciones de clases |
| `neo4j/` | Neo4j / Cypher | Importación del grafo de propiedades |

Node ejecuta TypeScript eliminando los tipos sin `npm install`; esto no realiza
un chequeo estático. SQLite usa la biblioteca estándar de Python y una base en
memoria. SQL reutiliza la extracción léxica de Python, pero calcula el ranking
en `sql/rank.sql` con parámetros enlazados. `sql/schema.sql` define las claves
foráneas; `sql/queries.sql` muestra ambigüedad e hiperonimia transitiva.

## Modelo de conocimiento

```mermaid
graph LR
  A[headache] -->|denotes| C[Concepto de cefalea]
  B[cefalea] -->|denotes| C
  M[Migraña de ejemplo] -->|hasSymptom| C
  R[Resfriado de ejemplo] -->|isA| E[Enfermedad respiratoria]
  E -->|isA| D[Enfermedad]
  F[cold] -->|denotes| T[Temperatura ambiental fría]
  F -->|denotes| S[Sensación de frío]
  F -->|denotes| R
```

Los sinónimos y las traducciones apuntan a conceptos compartidos. La hiperonimia
conceptual se representa con `rdfs:subClassOf` / `IS_A`. Varios sentidos
representan ambigüedad léxica; esta estructura no distingue por sí sola homonimia
y polisemia. «Frío» tiene sentidos de temperatura ambiental y sensación corporal;
«cold» en inglés también tiene un sentido de enfermedad. Los términos ambiguos
se muestran y se excluyen de la evidencia de síntomas.

Los conceptos OWL son clases, no pacientes. `hasSymptom` usa restricciones
existenciales OWL; observar un síntoma no implica una enfermedad. El programa no
ejecuta un razonador OWL. Las asociaciones de síntomas son ilustrativas.

## Recuperación y limitaciones

Los ejemplos normalizan mayúsculas y acentos y buscan términos completos. La
negación simple usa `sin`, `no`, `niego`, `not`, `without`, `deny`, `denies` hasta
puntuación o contraste (`pero`, `aunque`, `but`, `however`). Cada síntoma
coincidente suma un punto; cada síntoma asociado explícitamente negado resta
dos. La salida incluye coincidencias, conflictos y síntomas no mencionados.
No mencionado no equivale a ausente. Las puntuaciones iguales son empates de evidencia.

La heurística no comprende temporalidad, gravedad, sujeto ni negación compleja:
«not only fever» / «no solo fiebre» es una limitación conocida. Se demuestra una
arquitectura explicable, no un método clínico validado. No se traduce la entrada
automáticamente: solo se reconocen términos del léxico compartido. Las pruebas
de equivalencia entre idiomas cubren los ejemplos incluidos, no lenguaje clínico
sin restricciones.

## Neo4j y RDF

Ejecutar `neo4j/knowledge.cypher` en Neo4j Browser o usar
`cypher-shell -f neo4j/knowledge.cypher` con la autenticación de la instancia.
No requiere APOC ni n10s. `MERGE` permite repetir el import con los mismos datos;
no elimina datos obsoletos tras cambios en el JSON. Los conceptos incluyen
`label_en` y `label_es`; `label` usa inglés por defecto. La identidad de cada
término incluye su idioma; ambos idiomas apuntan a los mismos nodos conceptuales.

```cypher
MATCH (d:KnowledgeDemo:Concept)-[:HAS_SYMPTOM]->(s:KnowledgeDemo:Concept)
RETURN d.label_es AS enfermedad, collect(s.label_es) AS sintomas;

MATCH (t:KnowledgeDemo:Term)-[:DENOTES]->(c:KnowledgeDemo:Concept)
WITH t, collect(c.label_es) AS sentidos WHERE size(sentidos) > 1
RETURN t.label, t.language, sentidos;
```

RDF incluye etiquetas conceptuales en ambos idiomas y etiquetas léxicas con su
idioma. Abrir `rdf/knowledge.ttl` en Protégé o cargarlo en un motor SPARQL:

```sparql
PREFIX ex: <https://example.org/knowledge-demo/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
SELECT ?disease ?label ?symptom WHERE {
  ?disease rdfs:label ?label ; rdfs:subClassOf ?restriction .
  FILTER(LANG(?label) = "es")
  ?restriction owl:onProperty ex:hasSymptom ; owl:someValuesFrom ?symptom .
}
```

SQL guarda traducciones en `concept_label(concept_id, language, label)` y sentidos
léxicos en `term_sense(term, language, concept_id)`. `rank.sql` recibe `:lang`
como parámetro enlazado. `concept.label` usa inglés por defecto.

## Validación y regeneración

```sh
PYTHONPATH=python python -m unittest discover -s python/tests -v
node --test typescript/demo.test.ts
python -m unittest discover -s sql -p 'test_*.py' -v
python python/demo.py --export /tmp/knowledge-example
cp /tmp/knowledge-example/knowledge.ttl rdf/knowledge.ttl
cp /tmp/knowledge-example/knowledge.cypher neo4j/knowledge.cypher
```

Las pruebas cubren recuperación, sinónimos, acentos, negación, ambigüedad, límites
de palabra, equivalencia bilingüe, paridad de claves de traducción, exports
repetibles e integridad SQL. No arrancan Neo4j ni un razonador OWL. Los exports
se guardan en el repositorio para inspeccionarlos sin instalar otras herramientas.

## Fuentes reales y mantenimiento de traducciones

Para SNOMED CT: obtener una edición autorizada y archivos RF2; importar conceptos
activos, descripciones por idioma y relaciones conservando IDs oficiales, edición
y procedencia. Los IDs `Example...` no son IDs SNOMED. No afirmar equivalencias
OWL sin verificar su significado.

Para María Moliner: usar una fuente autorizada de entradas, sentidos y relaciones,
conservando su procedencia sin copiar contenido protegido al repositorio.
Distinguir hiperonimia léxica de inclusión entre clases conceptuales. La
desambiguación contextual queda para una etapa futura; no se conecta a una API terminológica oficial en vivo.

Mantener una implementación por tecnología y un conjunto común de IDs. Actualizar
juntos `locales/en.json` y `locales/es.json`; añadir términos y su idioma en
`data/knowledge.json`. Modificar ambos README en el mismo cambio, regenerar
exports y ejecutar todas las pruebas. No duplicar lógica por idioma humano.
El archivo LICENSE conserva el texto legal original.


## Demo interactiva en el navegador

`web/` contiene una aplicación adaptable a móvil, bilingüe, con descripciones
de ejemplo, tarjetas explicables de candidatos, nodos seleccionables y representaciones en pantalla
de RDF/OWL, Cypher y SQL. Importa el mismo motor puro (`typescript/core.ts`) que
la consola; no hay otra implementación de ranking para el navegador. El sitio
compilado incluye los datos sintéticos y las traducciones: no necesita API,
base de datos, fuentes externas, cuentas ni credenciales. Las descripciones
permanecen en memoria en el navegador; la aplicación no las transmite ni las
guarda. GitHub Pages sí sirve y registra las solicitudes normales del sitio.
Las representaciones se previsualizan en pantalla; descargar la seleccionada es opcional.

```sh
cd web
npm ci
npm run dev
# Compilación de producción, con chequeo estático TypeScript:
npm run build
npm run preview
```

Para probar en un navegador, compilar la aplicación y ejecutar desde la raíz
del repositorio. La prueba arranca y detiene su propio servidor en un puerto libre:

```sh
python -m pip install -r web/requirements-test.txt
python -m playwright install chromium
python web/test_browser.py
```

`CHROMIUM_PATH` permite seleccionar un Chromium existente. `DEMO_URL` cambia
el destino de las pruebas. Estas verifican ambos idiomas, selección de candidatos,
negación, ambigüedad, desbordamiento en móvil, representaciones en pantalla e invalidación
de resultados antiguos al editar la descripción.

### Publicar en GitHub Pages

1. Abrir **Settings → Pages → Build and deployment** del repositorio.
2. Seleccionar **Source: GitHub Actions** (requiere acceso de administración).
3. En **Actions → Validate and deploy demo**, pulsar **Run workflow** sobre `main`
   o subir un cambio a `main`.
4. Cuando el despliegue termine correctamente, abrir
   <https://beabustor.github.io/knowledge_engineer/>.

`.github/workflows/pages.yml` ejecuta pruebas Python, SQL, TypeScript y de
navegador, compila el sitio estático y despliega con el token temporal de GitHub.
Las solicitudes de cambios validan sin desplegar. No requiere secretos de
alojamiento ni servicios de pago para un repositorio público dentro de los límites
del plan gratuito aplicable. La configuración de Pages y la publicación correcta
se deben comprobar por separado: subir el workflow no demuestra que la web esté activa.


## Explorador de entidades, atributos, relaciones y acciones

La demo muestra todas las representaciones **en pantalla**, con descarga opcional:

- **Tipos de entidad:** Persona y Profesional sanitario.
- **Atributos:** Edad (entero) y Temperatura en Celsius (decimal), con dominio y rango.
- **Relaciones:** Realizada por y Tiene sujeto, como propiedades de objetos OWL.
- **Tipos de acción:** Acción y Medir temperatura.
- **Individuos:** una persona de 35 años, un profesional y una medición de 38.5 °C.

Las edades y mediciones son un caso fijo sintético, no datos extraídos del texto.
Seleccionar una tarjeta o un enlace cambia el grafo, RDF/Turtle, OWL/RDF/XML,
Neo4j/Cypher, SQL y el inspector inspirado en Protégé. Este último organiza
clases, atributos, relaciones e individuos; no ejecuta Protégé ni un razonador.
Neo4j y SQL muestran la representación, sin ejecutar consultas contra servidores.

`data/catalog.json` define los conceptos y `explorer/model.ts` genera las vistas.
Las pruebas comparan las tripletas RDF, OWL y SQL, además de probar la interfaz.

El catálogo inicial de alias referencia tos (`R05`), fiebre no especificada
(`R50.9`) y malestar/fatiga (`R53`) frente a **OMS CIE-10 2019**. El Excel
incluido tiene edición sin verificar y cobertura más amplia; ver apartado final. El químico referencia aspirina
(`CHEBI:15365`), agua (`CHEBI:15377`) y etanol (`CHEBI:16236`). Son referencias
seleccionadas manualmente con enlaces a la fuente; no son una importación
completa ni una consulta en vivo. La versión ChEBI no está fijada. Etiquetas,
alias y jerarquías generales son editoriales locales. `rdfs:seeAlso` enlaza la
fuente sin afirmar `owl:equivalentClass`. Una mención negada se marca como tal;
no se transforma en evidencia positiva ni en una decisión de codificación.

Para ampliar a otros dominios, añadir conceptos, alias bilingües, tipo,
procedencia y relaciones al catálogo. Los dominios actuales son clínica, química
y modelado. No hay un reconocimiento universal ni inferencia de tratamientos.


## Preparada para crecer, sin activar servicios de pago

La demo de Pages sigue siendo estática y funciona en el navegador. Las nuevas
carpetas no se importan en la web ni se despliegan por CI; todas las funciones
opcionales están desactivadas en `optional/config.example.json`.

| Carpeta | Preparación | Guía |
| --- | --- | --- |
| `optional/terminology/` | Adaptador FHIR para un servidor CIE-10 autorizado | [Módulos opcionales](optional/README.es.md) |
| `optional/ai/` | OpenAI/Claude por API, selección de modelo, controles y fundamentación | [Autenticación y límites](optional/README.es.md) |
| `optional/bulk/` | Plan de lotes limitado; no envía trabajos | [Escala y costes](optional/README.es.md) |
| `optional/storage/` | Rutas privadas de fuentes, consultas, índices y modelos | [Plan de almacenamiento](optional/storage/layout.json) |
| `infrastructure/docker/` | Perfil Docker opcional, servidor solo de salud | [Infraestructura](infrastructure/README.es.md) |
| `infrastructure/kubernetes/` | Plantillas: cero réplicas, sin exposición pública | [Activación gradual](infrastructure/README.es.md) |
| `infrastructure/cloud/azure/`, `aws/`, `gcp/` | Planes de servicios, identidades y nombres; sin recursos creados | [Planes cloud](infrastructure/README.es.md) |
| `research/snomed/` | Plan RF2 → etiquetas → evaluación → posible ajuste de modelo | [SNOMED CT](research/snomed/README.es.md) |
| `research/maria-moliner/` | Plan de sentidos y relaciones léxicas autorizadas | [María Moliner](research/maria-moliner/README.es.md) |

Las guías distinguen código disponible, plantillas y pasos aún sin implementar.
Activar una bandera no crea una plataforma de producción ni concede licencias.
ChatGPT/Claude web no equivalen a claves API; las credenciales solo van en
servidor. No hay entrenamiento, ingesta masiva ni aprovisionamiento automático.
Los recuentos de «dos millones de documentos» no se han verificado; RF2 contiene
conceptos/descripciones/relaciones, no necesariamente documentos clínicos.

Se ejecutan pruebas locales de bloqueo y límites, sin peticiones de pago:
`python -m unittest discover -s optional/tests -v`. Docker/Kubernetes, servidores
terminológicos autorizados y cuentas de IA/cloud requieren validación posterior.


## Excel CIE-10, consulta en directo y límite de entrada

La demo carga al primer análisis la copia `data/sources/cie10/cie10.xls` del
propio sitio. No requiere una API de pago ni manda tu consulta a GitHub/Google.
El archivo de origen contiene 13.750 códigos únicos normalizados y su procedencia
y SHA-256 constan en [la ficha de la fuente](data/sources/cie10/README.md).
Su edición y derechos de reutilización están sin verificar; no se presenta como
CIE-10-ES ni como edición OMS vigente. La licencia MIT no cubre esta hoja de terceros.
El módulo permite procesar XLS/XLSX/CSV locales (8 MB y 30.000 filas), pero la interfaz pública usa la copia incluida sin controles de carga.
El enlace Google Sheets aportado no pudo verificarse desde el entorno (403);
puede exportarse manualmente y seleccionarse como archivo local si se dispone de acceso.

La entrada admite **100 caracteres**, con contador y validación. El análisis se
actualiza 350 ms después de escribir; el botón Analizar sigue disponible. La
«Hoja de previsualización» muestra sujeto, predicado y objeto/valor. Las pestañas
RDF, OWL, Neo4j/Cypher, SQL, grafo e inspector cambian con el concepto elegido;
la descarga queda como opción posterior, no como sustituto de la vista.

«Tengo fiebre de 38 grados y me encuentro sin fuerzas» encuentra referencias de
fiebre y malestar/fatiga mediante alias locales y las filas de la hoja. «Sin fuerzas»
se reconoce como expresión de debilidad, no como su negación. Se representa además
una temperatura referida de 38; sin C/Celsius o F/Fahrenheit explícito no se inventa
la unidad. No se infiere una enfermedad ni se comprueba una medición. Reconocer
expresiones requiere reglas/alias: importar una clasificación no convierte el
sistema en un intérprete clínico general. Las etiquetas no traducidas siguen en
español y en la etiqueta inglesa se muestra el código, sin traducción inventada.

Para IA sin tarifa por consulta existe el adaptador **Ollama local, desactivado**;
ver [configuración](optional/README.es.md). No hay una API alojada gratuita sin
límites garantizados. Un modelo local consume recursos y está sujeto a su licencia.


### Cobertura del lenguaje: caso de prueba, no diagnóstico

«Tengo 35 años y tengo 38.5 de fiebre y manchas moradas en la piel» permite
examinar edad y temperatura referidas como atributos, y manchas moradas como
hallazgo descriptivo local. No se asigna un código o enfermedad a estas manchas
por su color. El Excel no contiene todos los sinónimos coloquiales; importar
más códigos no sustituye la capa lingüística. Las reglas actuales son explícitas,
limitadas y comprobables. Un LLM puede ayudar con paráfrasis y desambiguación,
pero necesita evaluación y no garantiza interpretación clínica correcta.


## Grafo principal y enriquecimiento externo limitado

El grafo aparece primero, antes de tablas y código. Incluye flechas etiquetadas,
sinónimos/sentidos, jerarquías, códigos, atributos y acciones; los nodos abren las
representaciones y hay controles de zoom. El Excel se carga automáticamente por
detrás, sin panel de archivos ni contador de códigos. La entrada admite 100 caracteres.

El enriquecimiento consulta bajo petición **OLS (EMBL-EBI)** y **CIMA (AEMPS)**.
Solo se envía el término de 2–80 caracteres que se escribe en ese panel, no la
descripción completa. El servicio externo recibe ese término y la IP de conexión.
Se muestran hasta 5 resultados, con identificador, enlace y etiqueta original.
`candidateMatch` es una anotación de candidato, no una equivalencia ontológica,
traducción validada ni asignación automática de CIE-10. No hay claves API ni IA de pago.

**Límite activo en Pages:** 6 solicitudes/minuto y 30 por 24 horas por perfil de
navegador, una simultánea por pestaña, caché de sesión para repetir búsquedas.
Se guardan únicamente marcas temporales en localStorage. Si no está disponible,
el contador dura esa pestaña. No se identifica un ordenador ni se recopila su IP.
Borrar almacenamiento, usar otro perfil o cambiar de navegador permite eludirlo:
esto no es protección contra abuso. Varias pestañas también pueden competir.
Los errores consumen petición; aciertos de caché no generan otra llamada.

**Límite por IP preparado, no desplegado:** `optional/api/public_lookup.py` aplica
6/minuto y 30/24h por IP, y 60/minuto y 500/24h de llamadas externas globales por
proceso, con 2 solicitudes externas simultáneas y caché de 128 entradas/24h.
No registra consultas/IP en logs de acceso; retiene identificadores hash con sal
aleatoria de proceso y marcas temporales hasta 24h. Los límites se reinician al
reiniciar el proceso. NAT comparte cuota; detrás de un proxy, limita la IP del
proxy: no confía en X-Forwarded-For. Para producción se necesita una pasarela
con proxies de confianza y un contador compartido (por ejemplo Redis) entre réplicas.

Para usarlo: activar `api.enabled` y `public_lookup.enabled` en una configuración
local revisada, fijar `allowed_origin`, desplegar tras TLS y compilar la web con
`VITE_LOOKUP_API_BASE=https://tu-servidor.example`. Esta variable es pública y no
lleva secretos. Por defecto está ausente y Pages consulta directamente las fuentes;
no se ha creado un servidor público, por lo que Pages no impone cuotas por IP.

Las pruebas de fuentes usan respuestas simuladas. Las consultas reales a OLS/CIMA
fueron bloqueadas por la red del entorno con 403; disponibilidad, CORS y condiciones
de cada fuente requieren validación desde la conexión de despliegue. Los errores
se muestran sin inventar resultados y sin desactivar la demo local.
