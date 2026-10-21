# Guía técnica

[English](../en/technical-guide.md)

La demo usa `data/catalog.json`, etiquetas bilingües propias e identificadores de
referencia. No incorpora una edición oficial completa de terminología.

```sh
cd web
npm ci
npm run dev
npm run build
```

Desde la raíz:

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

Las pruebas de navegador arrancan un servidor local y simulan las fuentes externas.
El último comando consulta HTTP real con términos fijos no personales; falla si
la red/fuente no responde, sin inventar éxito. `CHROMIUM_PATH` elige Chromium ya
instalado; `DEMO_URL` cambia el destino de pruebas.

Entrada: 100 caracteres. Consultas externas explícitas: 2–80 caracteres,
6/minuto y 30/24h por perfil, una en curso por pestaña. Borrar almacenamiento o
cambiar de perfil evade estas cuotas. La web estática no identifica IP/equipo.
La fuente recibe término explícito e IP de conexión. El backend opcional y sus
límites se describen en `optional/README.es.md`.

Las representaciones se ven en pantalla, con descarga opcional. El panel Protégé
es un inspector explicativo, no el editor. Se genera Cypher/SQL; SQLite se ejecuta
en validación, pero no se arranca un servidor Neo4j.

El importador opcional de hojas se prueba con archivos sintéticos. No se distribuye
una hoja licenciada o sin derechos verificados. Los ejemplos antiguos de enfermedades
siguen como ejercicios CLI en `python/`, `sql/` y `typescript/`, fuera del recorrido
principal y de la evaluación de extracción. No son un clasificador médico.
