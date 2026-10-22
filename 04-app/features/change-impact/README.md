# Guided purchase case / Caso guiado de compras

**EN.** One four-screen journey: before → catalog change → two explicit material decisions → resulting report. `dashboard.ts` owns navigation and visible feedback. `diagrams.ts` renders responsive supplier/catalog/report diagrams and local SVG drawings. Business rules live in `03-pipelines/01-impact/glove-case.ts`, not in UI event handlers.

**ES.** Un recorrido de cuatro pantallas: antes → cambio de catálogo → dos decisiones explícitas de material → informe resultante. `dashboard.ts` controla navegación y respuesta visible. `diagrams.ts` crea diagramas adaptables y dibujos SVG locales. Las reglas están en `03-pipelines/01-impact/glove-case.ts`, no en los eventos de interfaz.

- Every primary click changes the visible step or explains a missing/incompatible choice. / Cada acción avanza o explica qué decisión falta o es incompatible.
- Back preserves choices; restart clears them. / Volver conserva elecciones; reiniciar las borra.
- Main scope is six SKU mappings / 180 purchase lines. The larger dataset is not silently “fixed”. / El alcance es seis SKU y 180 líneas; no se presenta como resuelto el resto del conjunto.
- Result evidence uses these same six decisions in SQL, RDF, OWL and Cypher. / La evidencia usa las mismas seis decisiones en todos los formatos.

[Browser acceptance / Prueba de navegador](../../../05-validation/04-impact/test_browser.py)
