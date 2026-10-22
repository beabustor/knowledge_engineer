# A catalog changes. How do you update purchases without reviewing every line?

**A demo by Beatriz Bustos · Knowledge / Ontology Engineering**

[Español](README.es.md) · **[Try the visual walkthrough](https://beabustor.github.io/knowledge_engineer/)**

A laboratory buys gloves from three suppliers. Its report groups everything as “gloves”, but the team needs to distinguish nitrile and latex.

A new catalog introduces those two categories. Six product links now need updating without losing or misclassifying their 180 purchase lines.

## You make the decision

1. **Before:** a diagram connects suppliers, the old category and the purchase report.
2. **Change:** the app traces six affected links to their 180 dependent lines.
3. **Decide:** read the supplier’s material and choose nitrile or latex. Incompatible choices are explained and not applied.
4. **Result:** the report separates 90 nitrile lines and 90 latex lines. No purchase or amount is lost.

**The useful outcome:** review affected product links once, update all dependent purchases and retain the reason for each decision. No measured customer time saving is claimed.

<details>
<summary><strong>How can a technical team verify it?</strong></summary>

Open “Technical evidence” on the result screen:

- Inspect the six original SKUs, supplier material and review decisions.
- Execute SQLite in the browser. Query the same 180 lines and verify the same report and amounts.
- Inspect the same decisions in RDF/SKOS, OWL/RDF/XML and Cypher. Cypher is a preview; no Neo4j server is deployed.

This case is an explicitly scoped part of an 8,640-line synthetic regression dataset. The demo does not claim to have resolved all those other catalog changes.

[Data and validation](05-validation/04-impact/) · [Code map](09-docs/README.md)

```sh
npm ci --prefix 04-app
npm run dev --prefix 04-app
npm test --prefix 04-app
```

[Technical guide](09-docs/en/technical-guide.md)

</details>

Suppliers and purchases are fictional. Reviews last for the session. No paid APIs are needed. Importing company data and sharing team reviews are not implemented yet.
