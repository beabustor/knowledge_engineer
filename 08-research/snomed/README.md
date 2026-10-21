# SNOMED CT: licensed terminology research plan

[English](README.md) · [Español](README.es.md)

**Disabled. No SNOMED CT corpus is present.** The claimed “two million documents”
is not verified: SNOMED CT is a versioned terminology of concepts, descriptions,
relationships and reference sets, commonly distributed in RF2. Rows, descriptions,
versions and clinical documents are not interchangeable counts. Patient documents
are a separate dataset with additional permissions and privacy obligations.

1. **Rights and source:** consult [SNOMED International](https://www.snomed.org/)
   licensing/distribution channels and the applicable national release center.
   Identify edition, territory, affiliate terms and permitted AI uses. Do not
   assume extraction, external API processing, model training or redistribution
   are covered. Complete the source-specific rights manifest before any ingestion.
2. **Inventory:** obtain authorized RF2 files through the approved channel; record
   edition/version, checksum, origin, license and number of active/inactive
   concepts, descriptions and relationships. Keep immutable restricted snapshots.
3. **Normalize:** preserve SCTIDs, language reference sets, acceptability, effective
   dates, modules, relationship type and activity. Keep national extensions and
   editions distinct; retain provenance for every normalized record.
4. **Labels:** derive candidate supervised tasks from authorized descriptions and
   relationships: term→concept retrieval, synonym ranking, parent/type prediction
   and relationship extraction. Do not conflate descriptions with independent
   documents or blindly label unrecorded relationships as negative facts.
5. **Baseline first:** measure lexical/graph retrieval and, if permitted, embeddings
   and retrieval-augmented generation before considering a custom LLM. RAG is not
   a license workaround. OWL/RF2 semantics need faithful transformation.
6. **Dataset:** use a schema such as `id, input, target_ids, source_edition,
   source_record_ids, task, split, review_status`. Split by concept/family and
   release where appropriate to prevent synonym/version leakage. Build difficult
   negative examples and independent expert-reviewed evaluation, including
   ambiguity, negation, obsolete concepts and multilingual coverage.
7. **Pilot training only if authorized:** choose a base model with compatible
   terms, record dataset/base-model licenses and compute budget. Begin with a
   small reproducible fine-tuning experiment (e.g. parameter-efficient adaptation),
   not a promise to train a foundation model from scratch on a row count.
   Measure retrieval/code accuracy, abstention, calibration and memorization;
   do not claim diagnostic capability from terminology benchmarks.
8. **Scale:** checkpoint, track lineage and cost, isolate evaluation, review
   extraction/memorization risks, enforce deletion and access controls. Expanding
   compute requires new measured capacity and budget decisions, not auto-start.
9. **Release separately:** dataset, embeddings, ontology exports and weights may
   have different restrictions. Obtain publication permissions for each artifact;
   publish a model card, limitations and evaluation only where allowed. Do not
   expose licensed content through public demos or checkpoints by default.

There is no RF2 importer, trainer, model or cloud job implemented in this folder.
