# Un catálogo cambia. ¿Cómo actualizas las compras sin revisarlas una a una?

**Demo de Beatriz Bustos · Knowledge / Ontology Engineering**

[English](README.md) · **[Probar el recorrido visual](https://beabustor.github.io/knowledge_engineer/)**

Un laboratorio compra guantes a tres proveedores. Su informe agrupa todo como «guantes», pero el equipo necesita distinguir nitrilo y látex.

La nueva versión del catálogo introduce esas dos categorías. Ahora hay que actualizar los enlaces de seis productos sin perder ni clasificar mal sus 180 líneas de compra.

## Tú tomas la decisión

1. **Antes:** un diagrama muestra los proveedores, la categoría antigua y el informe.
2. **Cambio:** la aplicación localiza seis enlaces afectados y sus 180 líneas dependientes.
3. **Decidir:** consulta el material que indica el proveedor y elige nitrilo o látex. Una elección incompatible se explica y no se aplica.
4. **Resultado:** el informe separa 90 líneas de nitrilo y 90 de látex. Ninguna compra ni importe se pierde.

**La utilidad:** revisar los enlaces de producto afectados una vez, actualizar todas las compras que dependen de ellos y conservar el motivo de cada decisión. No se afirma un ahorro de tiempo medido en clientes.

<details>
<summary><strong>¿Cómo puede comprobarlo un equipo técnico?</strong></summary>

En el resultado, abre «Evidencia técnica»:

- Inspecciona los seis SKU originales, su material y su decisión de revisión.
- Ejecuta SQLite en el navegador. Consulta las mismas 180 líneas y comprueba que devuelve el mismo informe y los mismos importes.
- Inspecciona las mismas decisiones en RDF/SKOS, OWL/RDF/XML y Cypher. Cypher es una previsualización; no hay servidor Neo4j.

El caso es una parte explícita de un conjunto sintético de 8.640 líneas usado para pruebas de cambios más amplios. La demo no afirma haber resuelto todos esos otros cambios.

[Datos y validación](05-validation/04-impact/) · [Mapa del código](09-docs/README.md)

```sh
npm ci --prefix 04-app
npm run dev --prefix 04-app
npm test --prefix 04-app
```

[Guía técnica](09-docs/es/technical-guide.md)

</details>

Los proveedores y las compras son ficticios. Las decisiones duran la sesión. La demo funciona sin APIs de pago. Importar datos de una empresa o compartir revisiones entre usuarios sigue pendiente.
