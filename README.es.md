# Tu catálogo cambia. ¿Qué pasa con tus datos?

**Un ejemplo práctico de Beatriz Bustos · Knowledge / Ontology Engineering**

[English](README.md) · **[Abrir la demo](https://beabustor.github.io/knowledge_engineer/)**

Tres proveedores llaman de forma distinta a sus productos. Un equipo usa un catálogo común para agrupar sus compras y preparar informes.

**Cuando cambia ese catálogo, algunas compras dejan de estar bien clasificadas. Revisarlo todo a mano cuesta tiempo.**

Este proyecto localiza las compras afectadas, explica el motivo y permite comprobar la corrección sin perder registros.

## Un ejemplo que se entiende

Antes, el catálogo tenía una categoría: **guante de protección**.

Ahora distingue **guante de nitrilo** y **guante de látex**. No sirve mover todos los productos a la misma categoría. Hay que consultar el material que indica cada proveedor.

La demo muestra ese dato, propone la clasificación y permite aplicar la revisión. Después se puede comprobar cómo cambia el informe de compras.

## Pruébalo en tres pasos

1. **Ver el problema:** una actualización deja 900 líneas de compra pendientes de revisar.
2. **Revisar los guantes:** comprobar el material permite clasificar sus 180 líneas.
3. **Completar el ejemplo:** 720 líneas recuperan su clasificación. Otras 180 no tienen sustituto justificado y quedan separadas para revisión. **No se borra ninguna compra.**

El caso contiene 8.640 líneas de compra y tres proveedores ficticios. Todos los datos y decisiones son ejemplos: no clientes reales ni un ahorro de tiempo ya medido.

## Qué aporta a un equipo

Permite **concentrar la revisión en lo que ha cambiado**, en lugar de revisar todo el catálogo. Conserva la explicación de cada decisión y comprueba que los registros y sus importes no desaparecen.

<details>
<summary><strong>Para perfiles técnicos: cómo se demuestra</strong></summary>

- Dos versiones del catálogo: 57 y 60 conceptos; 288 enlaces entre productos y categorías.
- Comparación de versiones y seguimiento de las compras dependientes.
- SQL ejecutado realmente en el navegador, comparado con el resultado del grafo.
- Validación SHACL e inferencia SKOS en pruebas reproducibles.
- RDF, OWL y Cypher representan los mismos datos revisados. Cypher se previsualiza; no hay Neo4j desplegado.
- Base común: estándares SKOS, PROV-O, OWL y schema.org. El catálogo de ejemplo es propio; no se atribuyen sus cambios a organismos externos.

[Resultados verificables](05-validation/04-impact/report.json) · [Mapa del código](09-docs/README.md) · [Orden y nombres](09-docs/NAMING.md)

```sh
npm ci --prefix 04-app
npm run dev --prefix 04-app
```

[Guía técnica y comandos de validación](09-docs/es/technical-guide.md)

</details>

La demo principal funciona sin APIs de pago. Las revisiones duran la sesión. Importar catálogos de una empresa y compartir revisiones entre usuarios sería el siguiente paso; **no está implementado todavía**.
