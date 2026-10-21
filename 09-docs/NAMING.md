# Naming and navigation / Nombres y navegación

**EN.** Numbered root folders express responsibility and dependency direction, not a rigid runtime sequence. Application code imports data, models and pipelines; domain pipelines never import the browser UI. Optional deployment, research and legacy examples are separate branches. Stable stage IDs live in [execution-map.json](../03-pipelines/execution-map.json); rename a stage deliberately, not whenever a function moves.

**ES.** Las carpetas raíz numeradas expresan responsabilidades y dependencias, no una secuencia rígida de ejecución. La interfaz importa datos, modelos y análisis; los análisis de dominio no importan la interfaz. Despliegue opcional, investigación y ejemplos antiguos son ramas separadas. Los identificadores estables están en [execution-map.json](../03-pipelines/execution-map.json); no cambian por mover una función.

| Element / Elemento | Convention / Convención |
| --- | --- |
| Root stages / Etapas raíz | `01-data` … `09-docs`: two digits, English, kebab-case / dos dígitos, inglés, kebab-case |
| Feature folders / Funcionalidades | Name the responsibility: `change-impact`, `text-annotation` / nombrar la responsabilidad |
| TypeScript modules / Módulos | `kebab-case.ts`; types `PascalCase`, functions/variables `camelCase` |
| Python modules / Módulos | `snake_case.py`; functions/variables `snake_case` |
| Tests / Pruebas | TypeScript `*.test.ts`; Python `test_*.py`; semantic verification has explicit entry commands / verificaciones con comandos explícitos |
| Data identifiers / Identificadores | Stable `PascalCase` concepts, `M0001` mappings, `P00001` records; identifiers survive label changes / sobreviven cambios de etiqueta |
| Versions / Versiones | Explicit release metadata and checksums; never silently overwrite v1 / versiones explícitas, checksum y v1 conservada |
| UI language / Idioma | Original IDs stay stable; user-facing labels EN/ES / identificadores estables, etiquetas EN/ES |
| Comments / Comentarios | Explain a decision, invariant or constraint. No numbering every line / explicar decisiones, invariantes y límites; no numerar cada línea |

Use `//` or `/** … */` for TypeScript comments; `#` for Python and shell. `#` is not a general TypeScript comment. The runtime has event-driven branches and async work; a numbered function list must not pretend it is a call stack.

Usar `//` o `/** … */` en TypeScript y `#` en Python y shell. `#` no es un comentario general en TypeScript. La ejecución tiene eventos y tareas asíncronas; un índice numerado no debe aparentar una pila de llamadas lineal.

Formatting / Formato: `npm run format:check --prefix 04-app`. Root stages, subfolder purpose and Mermaid dependency diagrams provide a coherent visual identity without decorating function names or hiding technical limitations.
