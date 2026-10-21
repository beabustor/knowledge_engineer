# Optional server-side extensions — OFF by default

[English](README.md) · [Español](README.es.md)

These modules are not imported, deployed or activated by the browser demo or
GitHub Pages workflow. `config.example.json` sets every feature to false. No paid
call, resource provisioning, bulk query or training runs at import time.

## Capability map and boundaries

| Folder | Available now | Still required before production |
| --- | --- | --- |
| `api/` | Local health/capability HTTP scaffold | Auth, authorization, quotas, TLS gateway and functional query routes |
| `terminology/` | Opt-in FHIR ValueSet `$expand` request adapter | Authorized server, exact ICD-10 edition/ValueSet, API contract and rights review |
| `ai/` | Opt-in OpenAI Responses and Anthropic Messages adapters; grounded-prompt helper | Operator-selected model, API account, validated response parsing and clinical evaluation |
| `bulk/` | Bounded offline dry-run planner | Durable queue, worker implementation, cancellation and cost accounting |
| `storage/` | Naming/layout plan | Storage adapter, IAM, encryption, retention and deletion implementation |

These are integration starting points, not a production inference platform.
No HTTP route invokes AI. Enabling `api` alone starts only
`/health` and `/capabilities`; enabling `public_lookup` additionally permits the
rate-limited public-source proxy described below. Azure/OpenAI cloud identity is documented as a
future adapter, not implemented authentication.

## Safe activation, step by step

1. Keep the free site independent. Clone configuration to the ignored
   `optional/config.local.json`; do not edit frontend code to add credentials.
2. Choose exactly one feature. Identify its authorized source, edition, API
   terms, region, data handling requirements and expected cost before activation.
3. For local backend scaffolding set only `api.enabled=true`, then run:
   `python -m optional.api.server --config optional/config.local.json`.
   Check `/health` locally. It binds to loopback by default.
4. For terminology, configure an HTTPS FHIR server you are authorized to use,
   `allowed_host`, edition-specific `value_set_url` and `license_verified=true`.
   Enable `terminology.enabled`. Test `build_request` offline first, then invoke
   `search` explicitly with synthetic text. The adapter only calls `$expand`.
   It does not authenticate with WHO, infer diseases or switch to ICD-11.
5. For AI, select provider and available model explicitly. Configure the API key
   in the server's secret store, then set both `ai.enabled` and
   `ai.allow_paid_requests` true. `complete` makes one request, without retries.
   Do not expose it as an unauthenticated endpoint. Resolve candidates using
   authorized terminology first; use `grounded_prompt` for a shortlist.
   Parse the provider's response envelope into a JSON object and apply
   `validate_selection`. That check rejects unknown IDs, not clinical mistakes.
6. Test on synthetic cases, including negation, ambiguity, no match, expired
   credentials, timeout, unsupported edition, quota exhaustion and provider errors.
   Add expert-reviewed evaluation before clinical use. Do not use real patient
   descriptions until data handling and consent/lawful basis are resolved.
7. Integrate secured application routes and a gateway before Internet exposure.
   Configure quotas, per-user authorization, monitoring, deletion and budget alerts.
   Leave every unrelated feature off. Revert switches and revoke credentials to stop.

## Authentication and model configuration

- OpenAI API: server-side `OPENAI_API_KEY`; endpoint `/v1/responses`.
- Anthropic API: server-side `ANTHROPIC_API_KEY`; endpoint `/v1/messages`.
- ChatGPT/Claude web subscriptions and consumer login sessions are not API keys;
  paid API access, model availability and terms are separate. No scraping of
  browser cookies or reuse of consumer session tokens is implemented.
- Azure OpenAI: plan an Azure resource, deployment name, API version and managed
  identity (preferred) or API key. `AZURE_OPENAI_*` names in `.env.example` are
  reserved placeholders only; implement and test the Azure-specific adapter.
- Enterprise OAuth/OIDC: implement supported provider flows, redirect validation,
  scopes and server-side token handling; do not invent a universal OAuth flow.
- Never use `VITE_*` for secrets. Static frontend bundles are public. `.env` files
  are ignored but are not a substitute for a secret manager in deployment.

Models are intentionally not hard-coded; select one available in the target
account and region and test the request schema for that model. Output limits and
prompt limits are basic per-call safeguards, not a financial spending cap.

## Bulk and storage

Activate `bulk` only for the dry-run planner. Default limits are 100 items and
one worker; the planner submits nothing and reports cost as unknown. A real
worker must enforce pagination limits, backpressure, per-provider rate limits,
idempotency, bounded retries, token/currency ceilings, cancellation and dead
letter handling. Test 100 items before 1,000; increase only after measured cost,
latency, error rates and license limits support it. No auto-scaling is configured.

`storage/layout.json` defines private paths, not real resources. Store authorized
source snapshots by edition; separate normalized data, indexes, evaluations,
training runs and audit. Never put licensed corpora or raw queries in public Git
or Pages artifacts. Query text retention is off. If enabled later, define purpose,
minimization, encryption, role access, retention, deletion and backup handling.
Cache keys need source edition, locale and pipeline/model version. Avoid logging
request bodies, API keys or patient identifiers.

## Verification

`python -m unittest discover -s optional/tests -v` runs offline tests with mock
credentials only. No paid request is made. Live credentials, cloud deployments,
provider responses and licensed terminology imports have not been validated.

## Optional local AI without per-query API fees

An Ollama adapter is available but **off**. It targets only
`http://127.0.0.1:11434/api/generate`. To use it later, independently install
Ollama, choose and obtain a model whose license permits your use, and test local
memory/latency requirements. Then explicitly set `ai.enabled=true`,
`provider="ollama"`, your exact installed `model` and `allow_local_requests=true`.
Keep `allow_paid_requests=false`. No model is downloaded or started by this repo.
Small models can have poor clinical extraction accuracy and require evaluation.

This avoids a hosted API's per-query quota; it is not unlimited computation:
RAM/VRAM, CPU/GPU, electricity, model context and license still impose limits.
Ollama/llama.cpp are local runtimes; WebLLM/Transformers.js are possible browser
alternatives, not integrated here. GitHub Pages cannot host an Ollama server.
The free demo uses deterministic rules and Excel lookup, not an LLM. Do not
expose your local runtime publicly without authentication and rate controls.

## Opt-in public terminology proxy

`api/server.py` additionally supports `/lookup?source=ols|cima&term=...` only when
`public_lookup.enabled=true`. See the root README for exact quotas, CORS origin,
privacy, trusted-proxy and single-process limitations. No AI route is exposed.
All source hosts are fixed; callers cannot supply arbitrary upstream URLs.
The static frontend can use it via the public `VITE_LOOKUP_API_BASE` build setting.
This server is a development scaffold; deploy behind a production TLS gateway,
request/connection limits and shared rate counters before public exposure.
