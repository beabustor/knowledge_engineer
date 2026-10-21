# Knowledge engineer: del lenguaje al grafo de conocimiento

[English](README.md) · [Español](README.es.md)

Ejemplo educativo para representar conocimiento médico y léxico en JSON,
Python, TypeScript, SQL, RDF/OWL y Neo4j, y recuperar enfermedades candidatas
a partir de descripciones en inglés o español. Requiere Python 3.10+ y, para
TypeScript, Node.js 22.18+. No es necesario instalar dependencias.

**Todos los datos son sintéticos.** No se incluyen contenidos de SNOMED CT ni
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
desambiguación contextual queda para una etapa futura; no hay conexión automática
a fuentes reales.

Mantener una implementación por tecnología y un conjunto común de IDs. Actualizar
juntos `locales/en.json` y `locales/es.json`; añadir términos y su idioma en
`data/knowledge.json`. Modificar ambos README en el mismo cambio, regenerar
exports y ejecutar todas las pruebas. No duplicar lógica por idioma humano.
El archivo LICENSE conserva el texto legal original.
