# Technical guide

[Español](../es/technical-guide.md)

The active demo uses `data/catalog.json`, project-authored bilingual labels and
reference identifiers. It does not bundle an official terminology release.

```sh
cd web
npm ci
npm run dev
npm run build
```

From the repository root:

```sh
node --test typescript/demo.test.ts explorer/model.test.ts web/import-catalog.test.ts web/public-lookup.test.ts
python -m pip install -r web/requirements-test.txt
python -m playwright install chromium
python web/test_browser.py
python -m unittest discover -s explorer -p 'test_*.py' -v
python semantic/validate.py
node evaluation/run.ts
python tests/integration/live_sources.py
```

Browser tests start their own local server and use fixture responses for external
services; the last command performs real HTTP checks with fixed non-personal terms.
It fails rather than inventing success when the network/provider is unavailable.
`CHROMIUM_PATH` selects an existing browser; `DEMO_URL` overrides the test target.

Frontend input is 100 characters. Direct public lookups are opt-in, 2–80 characters,
6 requests/minute and 30/24h per browser profile, one in flight per tab. Clearing
storage/profiles bypasses these quotas. No IP fingerprint is collected by the
static site. Sources receive the explicit term and connection IP. Optional proxy
limits and deployment caveats are documented in `optional/README.md`.

Technical views are generated on screen; downloads are optional. The Protégé panel
is an explanatory inspector, not the desktop editor. Cypher/SQL show representations;
SQLite runs in automated validation, but no Neo4j server is started.

The optional spreadsheet parser remains tested with synthetic workbooks. No licensed
or unverified workbook is shipped. Legacy synthetic disease examples remain available
as CLI exercises, outside the demo's main workflow; see `python/`, `sql/`, `typescript/`.
They are not the evaluated concept extraction pipeline or a medical classifier.
