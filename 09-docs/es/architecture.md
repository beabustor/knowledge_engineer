# Architecture / Arquitectura

[Execution diagram / Diagrama de ejecución](../EXECUTION.md) · [Naming / Nombres](../NAMING.md)

The main product is a guided catalog-change example, separate from the public-vocabulary text experiment. Domain code under `03-pipelines` does not import the UI. Data, concepts, mapping decisions and purchase records remain separate objects.

El producto principal es un caso guiado de cambio de catálogo, separado del experimento de vocabularios públicos. El dominio de `03-pipelines` no importa la interfaz. Datos, conceptos, decisiones y compras son objetos distintos.

| Responsibility / Responsabilidad | Location / Ubicación |
| --- | --- |
| Fixed catalogs and compact purchase rows / Catálogos y compras | `01-data/02-impact-scenario` |
| W3C vocabulary snapshots / Vocabularios W3C | `02-model/01-standards` |
| Diff, dependency traversal, decisions and invariants / Comparación, dependencias, decisiones e invariantes | `03-pipelines/01-impact/engine.ts` |
| RDF / OWL / Cypher from one triple model / Un modelo de tripletas | `03-pipelines/01-impact/representations.ts` |
| Guided UI / Interfaz guiada | `04-app/features/change-impact/dashboard.ts` |
| Actual SQLite/WASM / SQLite real | `04-app/adapters/sqlite.ts` |
| Full SHACL and SKOS inference / SHACL e inferencia | `05-validation/04-impact` |
| Optional text branch / Rama de texto separada | `04-app/features/text-annotation` |

The frozen fixture is not a claim of actual W3C/ChEBI release changes. Products are schema.org individuals classified using SKOS concepts; taxonomy links are `skos:broader`, not product class inheritance. A reviewed replacement does not assert `owl:sameAs` or `owl:equivalentClass`. Removed classifications are quarantined; their purchase amounts remain in totals.

El caso no atribuye cambios a versiones reales W3C/ChEBI. Los productos son individuos schema.org clasificados mediante conceptos SKOS; la jerarquía usa `skos:broader`, no herencia de clases de productos. Una sustitución revisada no afirma `owl:sameAs` ni `owl:equivalentClass`. Las clasificaciones retiradas pasan a cuarentena y sus importes permanecen en los totales.

Browser checks execute on current state. Full SHACL/OWL RL runs in tests. Neo4j is a preview, deployment scaffolds are disabled, and no team authentication or persistent review database is claimed.

El navegador comprueba el estado actual; SHACL/OWL RL se ejecutan en pruebas. Neo4j se previsualiza, el despliegue opcional está desactivado y no hay autenticación de equipo ni base persistente de revisiones.
