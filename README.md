# Your catalog changes. What happens to your data?

**A practical example by Beatriz Bustos · Knowledge / Ontology Engineering**

[Español](README.es.md) · **[Open the demo](https://beabustor.github.io/knowledge_engineer/)**

Three suppliers use different product names. A team uses one shared catalog to group its purchases and prepare reports.

**When that catalog changes, some purchases are no longer classified correctly. Reviewing everything by hand takes time.**

This project locates affected purchases, explains the reason and lets you verify the correction without losing records.

## One understandable example

The old catalog had one category: **protective glove**.

The new version distinguishes **nitrile gloves** and **latex gloves**. Moving every product into the same category would be wrong. The reviewer needs the material supplied by each vendor.

The demo shows that evidence, proposes a classification and lets you apply the review. You can then check how the purchase report changes.

## Try three steps

1. **See the problem:** an update leaves 900 purchase lines needing review.
2. **Review the gloves:** checking material lets you classify their 180 lines.
3. **Complete the example:** 720 lines regain a classification. Another 180 have no justified replacement and are set aside for review. **No purchase is deleted.**

The scenario contains 8,640 purchase lines and three fictional suppliers. Data and review decisions are examples, not actual customers or measured time savings.

## Why a team would use it

**Focus review on what changed**, rather than checking the whole catalog. Keep the explanation for each decision and verify that records and their amounts do not silently disappear.

<details>
<summary><strong>For technical reviewers: how it is demonstrated</strong></summary>

- Two catalog versions: 57 and 60 concepts; 288 links between products and categories.
- Version comparison and downstream purchase tracing.
- SQL actually executed in the browser and compared with graph aggregation.
- SHACL validation and SKOS inference in reproducible tests.
- RDF, OWL and Cypher preserve the reviewed facts. Cypher is a preview; no Neo4j server is deployed.
- Shared foundations: SKOS, PROV-O, OWL and schema.org standards. The example taxonomy is original; its changes are not attributed to external organizations.

[Verifiable results](05-validation/04-impact/report.json) · [Code map](09-docs/README.md) · [Naming and order](09-docs/NAMING.md)

```sh
npm ci --prefix 04-app
npm run dev --prefix 04-app
```

[Technical guide and validation commands](09-docs/en/technical-guide.md)

</details>

The main demo needs no paid APIs. Reviews last for the session. Importing a company catalog and sharing team reviews would be the next step; **these capabilities are not implemented yet**.
