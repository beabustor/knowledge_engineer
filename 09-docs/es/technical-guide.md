# Run and verify / Ejecutar y verificar

[Project / Proyecto](../../README.md) · [Code map / Mapa](../README.md)

Node.js 24; Python 3.10+. Run from the repository root / Ejecutar desde la raíz.

```sh
npm ci --prefix 04-app
npm run dev --prefix 04-app
npm run build --prefix 04-app
npm test --prefix 04-app
npm run format:check --prefix 04-app
python -m pip install -r 04-app/requirements-test.txt
python -m playwright install chromium
python 05-validation/04-impact/verify.py
python 05-validation/04-impact/test_browser.py
python 04-app/test_browser.py
python 05-validation/01-semantic/validate.py
python -m unittest discover -s 02-model -p 'test_*.py' -v
node 05-validation/02-extraction/run.ts
PYTHONPATH=06-examples/python python -m unittest discover -s 06-examples/python/tests -v
python -m unittest discover -s 06-examples/sql -p 'test_*.py' -v
PYTHONPATH=07-deployment python -m unittest discover -s 07-deployment/optional/tests -v
```

The main browser test follows all four guided steps, including incorrect choices, back/reset and real SQLite over the exact 180-line glove case. Full-fixture and scoped SHACL checks are separate. The secondary annotation browser test uses explicit public-API fixtures. Opt-in real HTTP checks use `python 05-validation/03-integration/live_sources.py`; they never silently fall back to fixtures.

La prueba principal recorre los cuatro pasos, incluidas elecciones incorrectas, volver/reiniciar y SQLite real sobre las 180 líneas del caso de guantes. Se separa de la validación SHACL del conjunto completo y del caso acotado. La prueba secundaria de anotaciones usa respuestas simuladas explícitas. Las comprobaciones HTTP reales se lanzan con `python 05-validation/03-integration/live_sources.py`; nunca sustituyen silenciosamente la red por ejemplos.

Regenerate original scenario / Regenerar el caso: `python 03-pipelines/01-impact/generate.py`. This writes deterministic frozen fixtures and checksums / genera datos deterministas y checksums. Scenario reviews are illustrative decisions, not official terminology updates or clinical validation.

Pages CI installs dependencies, builds `04-app/dist`, runs tests and deploys that directory. Deployment is confirmed only by a successful Actions run / El despliegue solo se confirma cuando Actions termina correctamente.
