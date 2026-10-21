# Sources, rights and provenance

[Español](../es/sources.md)

The active catalog is project-authored text under MIT with links to reference
identifiers. It is not an official or complete terminology release. The synthetic
evaluation phrases are CC0-1.0. Source-specific API terms continue to govern
external content; successful access is not a blanket redistribution license.

The previously bundled third-party ICD-10 Excel lacked verified redistribution
terms. It has been removed from the current repository tree and generated site.
Its provenance metadata remains for audit. **Old commits still contain it**;
removing historical blobs requires a separate, coordinated history rewrite and
cannot be claimed from deleting a current file. This project did not perform one.

For each future import record source, edition, license, checksum, transformations,
language and mapping review state. Do not label string matches as equivalence.
SNOMED CT and María Moliner source corpora are not included, ingested or trained.
See `08-research/` for conditional plans, not permission or delivered training.

The `05-validation/03-integration/live-report.json` snapshot establishes only that specific
Wikidata/ChEBI/HPO/OLS/NLM/CIMA queries worked at the recorded time. It does not establish uptime,
unlimited access, clinical correctness or rights to republish entire catalogs.

## Connected public services

| Connector | Endpoint / reference | Scope and terms |
| --- | --- | --- |
| Wikidata | [Entity search API](https://www.wikidata.org/w/api.php) · [CC0](https://www.wikidata.org/wiki/Wikidata:Licensing) | General entities; EN/ES search. Structured data CC0; no guessed translations. |
| ChEBI | [OLS search](https://www.ebi.ac.uk/ols4/api/search?q=water&ontology=chebi&rows=5) · [ChEBI](https://www.ebi.ac.uk/chebi/) | Chemical concepts, ontology-filtered. Original labels and source-specific terms. |
| HPO | [OLS search](https://www.ebi.ac.uk/ols4/api/search?q=cough&ontology=hp&rows=5) · [HPO](https://hpo.jax.org/) | Phenotypes, ontology-filtered; retain HPO terms/attribution. Not diagnostic rules. |
| OLS | [EMBL-EBI OLS](https://www.ebi.ac.uk/ols4/) | Broad ontology search; ontology provenance retained. |
| ICD-10-CM | [NLM Clinical Tables API](https://clinicaltables.nlm.nih.gov/apidoc/icd10cm/v3/doc.html) | **US clinical modification, English**, not WHO base ICD-10 or Spanish CIE-10-ES. Current service release unpinned; no cross-edition equivalence. NLM/CMS source terms apply. |
| CIMA | [AEMPS REST documentation](https://cima.aemps.es/cima/resources/docs/CIMA_REST_API.pdf) | Spanish medicine registrations; not a substance or disease classification. AEMPS terms apply. |

These anonymous search endpoints need no API key or paid AI subscription. Availability and quotas are controlled by the providers; free access does not mean unlimited calls. The demo adds a shared **6/minute, 30/24h browser quota**, one request at a time, up to five results and a bounded in-memory cache. The optional proxy supports the same source allowlist and is disabled by default. No automatic source calls happen on typing or page load.

### Text annotation workflow

1. Enter a sentence (100-character maximum).
2. In **Connect your text to public knowledge**, specify a fragment from that sentence, select a source and enter a search term. A Spanish fragment can be linked to an English search; the app does not invent translations.
3. Fetch candidate identifiers and descriptions. Only the search term is sent, not the separate sentence or review.
4. Accept, reject or leave each annotation pending. Acceptance records your judgment **for this sentence only**. Rejection removes the candidate edge but retains the review and source identifier for inspection.
5. Inspect the graph, RDF/OWL, Cypher and SQL. `TextAnnotation` individuals store evidence, simple-negation polarity and review status. `skos:prefLabel` / `skos:altLabel` carry labels; `prov:wasDerivedFrom` and timestamp annotations preserve provenance. No `owl:sameAs` or `owl:equivalentClass` is inferred. Ontology hierarchies/claims are not bulk imported by search.
6. Changing the sentence clears results and reviews. Nothing is persisted except quota timestamps; this is not a shared annotation database or model training pipeline.

SNOMED CT and María Moliner remain disabled pending appropriate rights. WHO APIs requiring authentication are not impersonated by the anonymous NLM connector. SKOS and PROV-O are representation standards, not remote knowledge catalogs.

Verification distinguishes live HTTP source checks from fixture-based browser acceptance. In this managed executor, the opt-in live Chromium run is blocked by `ERR_CERT_AUTHORITY_INVALID` for the environment proxy CA. TLS verification was not disabled. The failure is retained in `05-validation/03-integration/browser-live-report.json`; this is not a claim of successful live browser verification.
