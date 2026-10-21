# María Moliner: authorized lexical-relation research plan

[English](README.md) · [Español](README.es.md)

**Disabled. No dictionary text or scraper is included.** Buying a dictionary or
having website access does not by itself establish permission to extract its
contents, train a model or redistribute a relation database. Identify the exact
edition and rights holder and obtain appropriate permission or a documented
applicable legal basis. Do not bypass access restrictions or assume that every
text/data-mining exception applies to this project or permits publication.

1. **Rights:** record acquisition, extraction, storage, text/data mining, external
   processing, training and publication rights separately in the common manifest.
   Resolve territory, contractual conditions, third-party material and opt-outs.
2. **Source:** obtain an authorized machine-readable edition; record checksum,
   edition, page/entry identifiers and source-format constraints. If OCR is
   authorized and necessary, measure errors before building linguistic labels.
3. **Normalize senses:** separate headword, grammatical category, inflection,
   sense IDs and usage. Homonymy (distinct entries/origins) is not automatically
   polysemy (related senses). Do not flatten all senses into one concept.
4. **Extract candidate relations:** synonymy, antonymy, hypernymy/hyponymy,
   meronymy/holonymy and explicitly supported usage/domain relations. Store
   direction, source span/reference, method, confidence and reviewer state.
   “All possible relations” is an aspiration, not a completeness guarantee.
5. **Review:** distinguish dictionary-explicit assertions from model-inferred
   candidates. Validate stratified samples and ambiguous senses; track precision,
   recall against an annotated sample and inter-annotator agreement.
6. **Represent:** consider OntoLex-Lemon for lexical entries/forms/senses and SKOS
   for concept schemes, retaining provenance. Lexical hypernymy is not always
   `rdfs:subClassOf`; synonyms do not automatically imply `owl:sameAs`.
7. **Pilot models only if permitted:** compare rules and supervised extraction;
   use a licensed base model and small rights-cleared labels before training.
   Isolate evaluation by entry/sense to limit leakage. Hosted API upload needs
   its own permission and acceptable retention terms.
8. **Scale:** batch by stable entry ID, checkpoint, deduplicate, rate-limit any
   authorized API, track costs and review quality. Keep raw text and restricted
   derived relations private; define deletion propagation to indexes/checkpoints.
9. **Publish only cleared artifacts:** a graph of extracted relations may still
   be restricted by copyright, database rights, contract or source license.
   Dataset/weights publication is a separate decision. Use synthetic examples
   for the public demo until rights and release scope are resolved.

There is no ingestion, extraction pipeline or training runner in this folder.
