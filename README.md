# Knowledge engineer: from language to knowledge graphs

[English](README.md) · [Español](README.es.md)

**[Try demo →](https://beabustor.github.io/knowledge_engineer/)** · Available after GitHub Pages is enabled; see deployment instructions below.

Educational example of representing medical and lexical knowledge in JSON,
Python, TypeScript, SQL, RDF/OWL and Neo4j, then retrieving candidate diseases
from English or Spanish descriptions. Requires Python 3.10+; TypeScript examples
require Node.js 22.18+. Neither example requires dependency installation.

**The original disease model and people/actions scenario are synthetic.**
The explorer adds a small ICD-10/ChEBI reference identifier catalog with local
labels. No SNOMED CT or María Moliner dictionary content is included. Results are educational candidates, not diagnoses or probabilities;
do not use them for clinical decisions.

## Quick start

Run from the repository root. `--lang` selects the output language; the input
can use either language. The default output language is Spanish (`es`).

```sh
python python/demo.py --lang en "I have fever, cough and sore throat"
python python/demo.py --lang es "Tengo cefalea y náuseas, pero sin fiebre"
node typescript/demo.ts --lang en "Headache and nausea, but without fever"
python sql/demo.py --lang en "Headache and nausea, but without fever"
```

Append `--json` for machine-readable results. JSON keys, concept IDs, code
identifiers and database relationship names stay in English for interoperability;
labels and human-readable explanations are localized. Code comments use English.

## Technologies and layout

| Folder | Technology | Purpose |
| --- | --- | --- |
| `data/` | JSON | Shared synthetic concepts, associations and bilingual terms |
| `locales/` | JSON (`en`, `es`) | Shared translated concept labels and application messages |
| `python/` | Python | Lexical extraction, explainable ranking and exports |
| `typescript/` | TypeScript / Node.js | Independent extraction and ranking implementation |
| `sql/` | SQL / SQLite | Relational model, aggregate ranking and recursive hierarchy |
| `rdf/` | RDF / RDFS / OWL (Turtle) | Semantic representation and class restrictions |
| `neo4j/` | Neo4j / Cypher | Property graph import |

Node's native type stripping executes TypeScript without `npm install`; it does
not perform static type checking. SQLite uses Python's standard library and an
in-memory database. SQL reuses Python's lexical extraction, but performs ranking
in `sql/rank.sql` with bound parameters. `sql/schema.sql` defines foreign keys;
`sql/queries.sql` demonstrates ambiguity and transitive hypernymy.

## Knowledge model

```mermaid
graph LR
  A[headache] -->|denotes| C[Headache concept]
  B[cefalea] -->|denotes| C
  M[Example migraine] -->|hasSymptom| C
  R[Example common cold] -->|isA| E[Respiratory disease]
  E -->|isA| D[Disease]
  F[cold] -->|denotes| T[Cold weather]
  F -->|denotes| S[Feeling cold]
  F -->|denotes| R
```

Synonyms and translations point to shared concepts. Conceptual hypernymy is
represented as `rdfs:subClassOf` / `IS_A`. Multiple senses represent lexical
ambiguity; this structure alone does not distinguish homonymy from polysemy.
Spanish “frío” has weather and bodily-sensation senses; English “cold” also has
a disease sense. Ambiguous terms are reported and excluded from symptom evidence.

OWL concepts are classes, not patients. `hasSymptom` uses existential OWL
restrictions; observing a symptom does not entail a disease. The program does
not run an OWL reasoner. All symptom associations are illustrative.

## Retrieval and limitations

The examples normalize case and accents and match whole terms. Simple negation
uses `sin`, `no`, `niego`, `not`, `without`, `deny`, `denies` until punctuation or
contrast (`pero`, `aunque`, `but`, `however`). Each matching symptom adds one
point; each associated explicitly negated symptom subtracts two. Output includes
matches, conflicts and unmentioned symptoms. Unmentioned is not equivalent to
absent. Equal scores represent ties in evidence.

The heuristic does not understand temporal context, severity, experiencer or
complex negation: “not only fever” / “no solo fiebre” is a known limitation.
These examples demonstrate an explainable architecture, not a validated clinical
method. Input is not automatically translated; only terms in the shared lexicon
are recognized. Cross-language equivalence tests cover the included examples,
not unrestricted clinical language.

## Neo4j and RDF

Run `neo4j/knowledge.cypher` in Neo4j Browser, or use
`cypher-shell -f neo4j/knowledge.cypher` with your instance's authentication.
No APOC or n10s is required. `MERGE` makes imports repeatable for the same data;
it does not remove stale data after changes to JSON. Concept properties include
`label_en` and `label_es`; `label` defaults to English. Term identity includes
its language, and both languages point to the same concept nodes.

```cypher
MATCH (d:KnowledgeDemo:Concept)-[:HAS_SYMPTOM]->(s:KnowledgeDemo:Concept)
RETURN d.label_en AS disease, collect(s.label_en) AS symptoms;

MATCH (t:KnowledgeDemo:Term)-[:DENOTES]->(c:KnowledgeDemo:Concept)
WITH t, collect(c.label_en) AS senses WHERE size(senses) > 1
RETURN t.label, t.language, senses;
```

RDF has concept labels in both languages, and lexical labels tagged with their
language. Open `rdf/knowledge.ttl` in Protégé or load it into a SPARQL engine:

```sparql
PREFIX ex: <https://example.org/knowledge-demo/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
SELECT ?disease ?label ?symptom WHERE {
  ?disease rdfs:label ?label ; rdfs:subClassOf ?restriction .
  FILTER(LANG(?label) = "en")
  ?restriction owl:onProperty ex:hasSymptom ; owl:someValuesFrom ?symptom .
}
```

SQL stores translations in `concept_label(concept_id, language, label)` and
lexical senses in `term_sense(term, language, concept_id)`. `rank.sql` accepts
`:lang` as a bound parameter. `concept.label` defaults to English.

## Validation and regeneration

```sh
PYTHONPATH=python python -m unittest discover -s python/tests -v
node --test typescript/demo.test.ts
python -m unittest discover -s sql -p 'test_*.py' -v
python python/demo.py --export /tmp/knowledge-example
cp /tmp/knowledge-example/knowledge.ttl rdf/knowledge.ttl
cp /tmp/knowledge-example/knowledge.cypher neo4j/knowledge.cypher
```

Tests cover retrieval, synonyms, accents, negation, ambiguity, word boundaries,
bilingual equivalence, locale key parity, repeatable exports and SQL integrity.
They do not start Neo4j or an OWL reasoner. Generated exports are committed for
inspection without installing additional tools.

## Real sources and translation maintenance

For SNOMED CT, obtain an authorized edition and RF2 files; import active concepts,
language descriptions and relationships, retaining official IDs, edition and
provenance. `Example...` IDs are not SNOMED IDs. Do not assert OWL equivalence
without checking meaning.

For María Moliner, use an authorized source for entries, senses and relationships
and retain provenance without copying protected content into this repository.
Distinguish lexical hypernymy from conceptual class inclusion. Contextual
sense disambiguation is future work; no live official terminology API is connected.

Keep one implementation per technology and one shared set of concept IDs. Update
`locales/en.json` and `locales/es.json` together; add terms and their language in
`data/knowledge.json`. Update both READMEs in the same change, regenerate exports
and run all tests. Do not duplicate program logic per human language. The LICENSE
file retains the original legal text.


## Interactive browser demo

`web/` contains a responsive, bilingual application with example descriptions,
explainable candidate cards, selectable graph nodes, and on-screen RDF/OWL, Cypher and SQL
representations. It imports the same pure engine (`typescript/core.ts`) as the CLI;
there is no separate browser ranking implementation. The compiled site bundles
the synthetic dataset and translations, so analysis requires no API, database,
external font, account or credential. Descriptions stay in memory in the browser;
the application does not transmit them or store them. GitHub Pages still serves
and logs ordinary site requests. Representations are previewed on screen; downloading the selected representation is optional.

```sh
cd web
npm ci
npm run dev
# Production build, including static TypeScript checking:
npm run build
npm run preview
```

For browser tests, build the app, then run from the repository root. The test
starts and stops its own local server on an available port:

```sh
python -m pip install -r web/requirements-test.txt
python -m playwright install chromium
python web/test_browser.py
```

An existing Chromium can be selected with `CHROMIUM_PATH`. `DEMO_URL` overrides
the test target. Tests exercise both languages, candidate selection, negation,
ambiguity, mobile overflow, on-screen representations and invalidation of stale results.

### Publish to GitHub Pages

1. Open repository **Settings → Pages → Build and deployment**.
2. Set **Source** to **GitHub Actions** (requires repository administration access).
3. In **Actions → Validate and deploy demo**, use **Run workflow** on `main`, or
   push a change to `main`.
4. After the deployment succeeds, open
   <https://beabustor.github.io/knowledge_engineer/>.

`.github/workflows/pages.yml` runs the Python, SQL, TypeScript and browser tests,
builds the static site, and deploys using GitHub's short-lived workflow token.
Pull requests validate without deployment. No hosting secret or paid service is
required for a public repository under GitHub's applicable free-plan limits.
Pages settings and successful publication must be checked separately from a Git
push; a committed workflow alone does not establish that the site is live.


## Explorer: entities, attributes, relationships and actions

The demo shows all representations **on screen**, with optional downloads:

- **Entity types:** Person and Clinician.
- **Attributes:** Age (integer) and Temperature in Celsius (decimal), with domains and ranges.
- **Relationships:** Performed by and Has subject, represented as OWL object properties.
- **Action types:** Action and Measure temperature.
- **Individuals:** a 35-year-old person, a clinician and a measurement of 38.5 °C.

Ages and measurements form a fixed synthetic scenario, not facts extracted from
input text. Selecting a card or link changes the graph, RDF/Turtle, OWL/RDF/XML,
Neo4j/Cypher, SQL and a Protégé-inspired inspector. The inspector organizes
classes, attributes, relationships and individuals; it does not run Protégé or
a reasoner. Neo4j and SQL show representations without executing server queries.

`data/catalog.json` defines the concepts; `explorer/model.ts` generates the views.
Tests compare RDF, OWL and SQL triples and exercise the browser interface.

The built-in clinical alias catalog references cough (`R05`), unspecified fever
(`R50.9`) and malaise/fatigue (`R53`) against **WHO ICD-10 2019**. The bundled
Excel has its own unverified edition and broader coverage; see below. The chemical
catalog references aspirin (`CHEBI:15365`), water (`CHEBI:15377`) and ethanol
(`CHEBI:16236`). These are manually selected references with source links, not a
full terminology import or a live query. The ChEBI release is unpinned. Labels,
aliases and broad hierarchies are local editorial text. `rdfs:seeAlso` links to
the source without asserting `owl:equivalentClass`. Negated mentions are marked;
they do not become positive evidence or coding decisions.

To extend to other domains, add concepts, bilingual aliases, kinds, provenance
and relationships to the catalog. Current domains are clinical, chemical and
modeling. There is no universal entity recognition or treatment inference.


## Ready to extend, without enabling paid services

The Pages demo remains static and browser-only. New folders are not imported by
the web app or deployed by CI; all optional features are off in
`optional/config.example.json`.

| Folder | Preparation | Guide |
| --- | --- | --- |
| `optional/terminology/` | FHIR adapter for an authorized ICD-10 server | [Optional modules](optional/README.md) |
| `optional/ai/` | OpenAI/Claude API adapters, model selection, gates and grounding | [Authentication and limits](optional/README.md) |
| `optional/bulk/` | Bounded batch planner; submits no jobs | [Scale and costs](optional/README.md) |
| `optional/storage/` | Private source/query/index/model naming scheme | [Storage plan](optional/storage/layout.json) |
| `infrastructure/docker/` | Opt-in Docker profile with health-only backend | [Infrastructure](infrastructure/README.md) |
| `infrastructure/kubernetes/` | Zero-replica templates, no public endpoint | [Gradual activation](infrastructure/README.md) |
| `infrastructure/cloud/azure/`, `aws/`, `gcp/` | Service/identity/naming plans; no resources created | [Cloud plans](infrastructure/README.md) |
| `research/snomed/` | RF2 → labels → evaluation → possible fine-tuning plan | [SNOMED CT](research/snomed/README.md) |
| `research/maria-moliner/` | Authorized senses and lexical-relation research plan | [María Moliner](research/maria-moliner/README.md) |

Guides distinguish working scaffolds, templates and missing implementations.
A feature flag does not create a production platform or grant source rights.
ChatGPT/Claude web accounts are not API credentials; keys belong on servers.
No training, bulk ingestion or resource provisioning runs automatically. The
“two million documents” count is unverified; RF2 concepts/descriptions/relations
are not necessarily clinical documents.

Offline gate/limit tests make no paid calls:
`python -m unittest discover -s optional/tests -v`. Docker/Kubernetes, authorized
terminology servers and real AI/cloud accounts require separate validation.


## ICD-10 Excel, live preview and input limit

On first analysis the demo loads its own bundled `data/sources/cie10/cie10.xls`
snapshot. No paid API is required and queries are not sent to GitHub/Google.
The source yields 13,750 unique normalized codes; provenance and SHA-256 are
recorded in the [source notes](data/sources/cie10/README.md). Source edition and
reuse rights remain unverified; this is not advertised as a current official
release or Spanish clinical modification. MIT does not cover this third-party
spreadsheet. The import module supports local XLS/XLSX/CSV (8 MB and 30,000 rows maximum), but the public UI uses the bundled file without upload controls.
The supplied Google Sheet could not be verified from the environment (403);
if accessible, export it manually and select the local file.

Input is limited to **100 characters**, with a counter and validation. Analysis
updates 350 ms after typing; Analyze remains available. The Preview sheet displays
subject, predicate and object/value. RDF, OWL, Neo4j/Cypher, SQL, graph and inspector
views change with the selected concept. Downloading is an optional next step,
not a substitute for previewing.

“Tengo fiebre de 38 grados y me encuentro sin fuerzas” matches fever and
malaise/fatigue references through local aliases and spreadsheet rows. “Sin fuerzas”
is interpreted as weakness, not its negation. A reported value of 38 is also
represented; absent explicit Celsius/C or Fahrenheit/F, the unit is left unspecified.
No disease or verified measurement is inferred. Importing a classification does
not create a general clinical language interpreter: recognition still relies on
explicit rules/aliases. Untranslated descriptions remain Spanish; English labels
fall back to codes instead of fabricated translations.

An **optional, disabled local Ollama adapter** provides a path without per-query
API fees; see [configuration](optional/README.md). Hosted APIs do not guarantee
unlimited free usage; local models still consume hardware and carry license terms.


### Language coverage: test case, not a diagnosis

“Tengo 35 años y tengo 38.5 de fiebre y manchas moradas en la piel” exposes reported
age and temperature as attributes and purple skin spots as a local descriptive
finding. No disease or code is assigned from spot color. The spreadsheet does
not supply every colloquial synonym; more codes do not replace language parsing.
Current rules are explicit, limited and testable. An LLM may help with paraphrases
and disambiguation, but requires evaluation and does not guarantee clinical accuracy.


## Graph-first UI and bounded external enrichment

The query-generated labeled graph appears directly below the input, before tables and code, with synonym/sense links,
hierarchies, codes, attributes, actions, node selection and zoom. Excel loading
runs behind the scenes; upload controls and code-count panels are not shown.
Description input is limited to 100 characters.

Opt-in enrichment queries **OLS (EMBL-EBI)** and **CIMA (AEMPS)**. Only the 2–80
character term entered in that panel is sent, not the full description. The source
receives the term and connection IP. Up to 5 results retain their identifiers,
links and original untranslated labels. `candidateMatch` is a candidate annotation,
not validated equivalence, translation or automatic ICD-10 coding. No paid AI/API key.

**Active Pages limit:** 6 requests/minute and 30 per rolling 24 hours per browser
profile; one in-flight request per tab; session caching for repeated terms.
Only request timestamps are stored in localStorage. Without storage, the count
lasts for that tab. No IP or hardware fingerprint is collected. Clearing storage,
using another profile/browser and cross-tab races can bypass this best-effort
limit. It is not abuse protection. Failures count; cache hits make no new request.

**IP-limited proxy prepared, not deployed:** `optional/api/public_lookup.py` applies
6/minute and 30/24h per peer IP, plus global upstream limits of 60/minute and
500/24h per process, 2 concurrent upstream calls and a 128-entry/24h cache.
Access logs do not retain query strings/raw IPs. Salted process-local IP hashes
and timestamps last up to 24h; restarts reset quotas. NAT shares a quota. Behind
a proxy it sees that proxy's IP; untrusted X-Forwarded-For is ignored. Production
needs a trusted gateway and shared counters (e.g. Redis) across replicas.

To opt in: set `api.enabled` and `public_lookup.enabled` in reviewed local config,
set `allowed_origin`, deploy behind TLS and build with
`VITE_LOOKUP_API_BASE=https://your-server.example`. This public variable contains
no secrets. It is absent by default, so Pages calls sources directly. No public
backend was provisioned; Pages itself cannot enforce per-IP limits.

Source tests use fixtures. Real OLS/CIMA requests were denied by the environment
network with 403; live availability, CORS and source terms require validation from
the deployment connection. Errors are visible without fabricated results or
breaking local demo functionality.


### Reset between searches

Changing the description clears selection, filters, matches, external results
and their links. Late external responses are discarded. No-match queries retain
no previous representation, and empty input shows no fixed example graph. Excel
and quotas remain shared resources, not query results. The separate educational
candidate section can list **unmentioned** symptoms; these are not extracted findings.
