# Change analysis / Análisis de cambios

| Module / Módulo | Responsibility / Responsabilidad |
| --- | --- |
| [engine.ts](engine.ts) | General release diff, dependency tracing and accounting over the full synthetic fixture / comparación, dependencias y contabilidad del conjunto completo |
| [glove-case.ts](glove-case.ts) | Exact public-demo scope: six glove SKU mappings, 180 lines, two evidence-based review choices / alcance exacto de la demo |
| [representations.ts](representations.ts) | One triple model → RDF, RDF/XML and Cypher / un modelo de tripletas para todos los formatos |
| [generate.py](generate.py) | Deterministically recreate original fixtures and checksums / regenerar datos propios y checksums |
| [engine.test.ts](engine.test.ts) | Full-fixture change, split, quarantine and accounting checks / pruebas del conjunto completo |
| [glove-case.test.ts](glove-case.test.ts) | Wrong material is rejected; review resolves 90 + 90 lines without changing amounts / revisión correcta y sin pérdida de importes |

**EN.** No browser, network or paid AI dependencies. Review decisions apply to source products, never global class equivalence. The UI's glove case does not resolve unrelated fixture changes. The larger corpus is a regression dataset, not measured customer scale or savings.

**ES.** Sin navegador, red ni IA de pago. Las decisiones se aplican a productos, no afirman equivalencia global de clases. El caso de guantes no resuelve otros cambios del conjunto. El corpus amplio es de regresión, no evidencia de escala ni ahorro reales.

[Execution map / Mapa de ejecución](../execution-map.json)
