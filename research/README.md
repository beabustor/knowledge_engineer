# Research preparation — no ingestion or training enabled

[English](README.md) · [Español](README.es.md)

| Source | Guide | Current status |
| --- | --- | --- |
| SNOMED CT | [Step-by-step plan](snomed/README.md) | No source files, no ingestion, no training |
| María Moliner | [Step-by-step plan](maria-moliner/README.md) | No dictionary text, scraping or relation extraction |

The guides explain technically plausible workflows, not a finding that a
particular license allows them. Review source rights separately for acquisition,
extraction, text/data mining, storage, external model processing, training,
dataset publication and model-weight publication. A license to read is not
necessarily permission for these other uses. Territory, edition, contracts,
third-party content and applicable law matter. Record authorized decisions with
the rights holder/licensing contact and qualified review where needed.

`common/rights-review.example.json` starts pending with all permissions false.
`common/prepare.py` only checks recorded fields and returns a plan. It does not
establish legal permission, authenticate a reviewer, ingest documents or run
training. Even an approved local manifest is not a legal grant or a production
access-control mechanism. No scraper or trainer is supplied.

Keep source data and outputs outside Git in approved private storage. If local
folders are necessary, `research/<source>/data/` and `outputs/` are ignored.
Do not send restricted texts to hosted model APIs unless this processing is
expressly permitted and the provider's retention/data-use terms are acceptable.
The repository's MIT license applies to repository code, not source corpora,
third-party terminology, dictionary text or derived assets subject to restrictions.
