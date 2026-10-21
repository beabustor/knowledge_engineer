/** UI entry for the guided scenario. Domain rules live in 03-pipelines, never here. */
import {
  baseline,
  updated,
  mappings,
  records,
  diff,
  analyze,
  stateOf,
  suggestedDecision,
  scenarioDecisions,
  validateData,
  type Lang,
  type Decisions,
  type Catalog,
} from '../../../03-pipelines/01-impact/engine.ts';
import { graph, serialize } from '../../../03-pipelines/01-impact/representations.ts';
let phase: 'v1' | 'v2' = 'v2';
let decisions: Decisions = {};
let selected = 'ProtectiveGlove';
let fault = false;
let language: Lang = 'en';
let sqlState = '';
let sqlBusy = false;
let generation = 0;
let validationShown = false;
let technicalOpen = false;
let codeTab: 'rdf' | 'owl' | 'cypher' | 'sql' = 'rdf';
const t = (en: string, es: string) => (language === 'es' ? es : en);
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
};
const number = (n: number) => new Intl.NumberFormat(language).format(n);
const label = (id: string, catalog: Catalog = updated) =>
  catalog.concepts.find((c) => c.id === id)?.labels[language] ??
  baseline.concepts.find((c) => c.id === id)?.labels[language] ??
  {
    unresolved: t('Not classified', 'Sin clasificar'),
    quarantined: t('Set aside for review', 'Separadas para revisión'),
  }[id] ??
  id;
const button = (text: string, id: string, action: () => void) => {
  const node = el('button', text, 'impact-button');
  node.type = 'button';
  node.id = id;
  node.onclick = action;
  return node;
};
function resetResults() {
  generation++;
  sqlState = '';
  validationShown = false;
}
function table(headers: string[], rows: (string | number)[][]) {
  const wrap = el('div', '', 'impact-table-wrap');
  const grid = el('table', '', 'impact-table');
  const head = el('thead'),
    header = el('tr');
  headers.forEach((v) => header.append(el('th', v)));
  head.append(header);
  grid.append(head);
  const body = el('tbody');
  for (const row of rows) {
    const tr = el('tr');
    row.forEach((v) => tr.append(el('td', String(v))));
    body.append(tr);
  }
  grid.append(body);
  wrap.append(grid);
  return wrap;
}
export function renderImpact(lang: Lang) {
  language = lang;
  const host = document.getElementById('impact-workbench')!;
  const previous = document.querySelector<HTMLDetailsElement>('#impact-technical');
  if (previous) technicalOpen = previous.open;
  host.replaceChildren();
  const catalog = structuredClone(phase === 'v1' ? baseline : updated);
  if (fault) catalog.concepts.find((c) => c.id === 'Supplies')!.broader = ['Glassware'];
  const ds = phase === 'v1' ? {} : decisions;
  const analysis = analyze(catalog, ds),
    original = analyze(baseline),
    changed = analyze(updated, ds);
  const story = el('section', '', 'radar-story');
  story.append(
    el('p', t('EXAMPLE · LABORATORY PURCHASES', 'EJEMPLO · COMPRAS DE UN LABORATORIO'), 'eyebrow'),
  );
  story.append(
    el(
      'h2',
      phase === 'v1'
        ? t('Before: every purchase has a category.', 'Antes: cada compra tiene una categoría.')
        : Object.keys(ds).length === 30
          ? t('Reviewed: nothing disappears.', 'Revisado: no desaparece ninguna compra.')
          : t(
              'The catalog changed. Some purchases need review.',
              'El catálogo cambió. Algunas compras necesitan revisión.',
            ),
    ),
  );
  story.append(
    el(
      'p',
      t(
        'Three suppliers use different product names. One shared catalog lets a team group its purchases. When that catalog changes, some links stop working.',
        'Tres proveedores usan nombres diferentes para sus productos. Un catálogo común permite agrupar las compras. Cuando ese catálogo cambia, algunos enlaces dejan de servir.',
      ),
    ),
  );
  const stats = el('div', '', 'impact-stats');
  for (const [value, title, kind] of [
    [
      analysis.unresolvedRecords,
      t(
        'purchase lines still need classification review',
        'líneas de compra necesitan revisar su clasificación',
      ),
      analysis.unresolvedRecords ? 'risk' : 'good',
    ],
    [records.length, t('purchase lines preserved', 'líneas de compra conservadas'), ''],
    [
      analysis.quarantinedRecords,
      t('lines set aside, with an explicit reason', 'líneas separadas, con un motivo explícito'),
      '',
    ],
  ] as const) {
    const card = el('div', '', 'impact-stat ' + kind);
    card.append(el('strong', number(value)), el('span', title));
    stats.append(card);
  }
  story.append(stats);
  const controls = el('div', '', 'impact-actions phase-controls');
  controls.append(
    button(t('See the original catalog', 'Ver el catálogo original'), 'impact-v1', () => {
      phase = 'v1';
      decisions = {};
      fault = false;
      resetResults();
      renderImpact(language);
    }),
    button(t('See the update problem', 'Ver el problema al actualizar'), 'impact-v2', () => {
      phase = 'v2';
      decisions = {};
      fault = false;
      resetResults();
      renderImpact(language);
    }),
  );
  story.append(controls);
  host.append(story);
  const example = el('section', '', 'radar-example');
  example.id = 'impact-trace';
  example.append(
    el('p', t('ONE CHANGE, EXPLAINED', 'UN CAMBIO, EXPLICADO'), 'eyebrow'),
    el(
      'h2',
      t(
        '“Protective glove” becomes two categories.',
        '«Guante de protección» pasa a ser dos categorías.',
      ),
    ),
  );
  example.append(
    el(
      'p',
      t(
        'The new catalog distinguishes nitrile and latex. Moving every glove to the same new category would be wrong. The supplier’s material field tells the reviewer which option to choose.',
        'El nuevo catálogo distingue nitrilo y látex. Mover todos los guantes a la misma categoría sería un error. El material indicado por el proveedor permite revisar qué opción corresponde.',
      ),
    ),
  );
  const cards = el('div', '', 'glove-cards');
  for (const material of ['nitrile', 'latex']) {
    const m = mappings.find(
      (m) => m.target === 'ProtectiveGlove' && m.attributes.material === material,
    )!;
    const reviewed = ds[m.id];
    const card = el('div', '', 'glove-card');
    card.append(
      el('span', t('Supplier evidence', 'Dato del proveedor')),
      el(
        'strong',
        material === 'nitrile'
          ? t('Material: nitrile', 'Material: nitrilo')
          : t('Material: latex', 'Material: látex'),
      ),
      el('div', '↓', 'glove-arrow'),
      el(
        'span',
        reviewed
          ? t('Reviewed classification', 'Clasificación revisada')
          : t('Proposed classification', 'Clasificación propuesta'),
      ),
      el('strong', label(material === 'nitrile' ? 'NitrileGlove' : 'LatexGlove')),
    );
    cards.append(card);
  }
  example.append(cards);
  const gloveGroup = changed.groups.find((g) => g.change.id === 'ProtectiveGlove')!;
  example.append(
    el(
      'p',
      t(
        'This change touches 6 supplier products and 180 purchase lines. One review group explains every affected line.',
        'Este cambio afecta a 6 productos de proveedores y 180 líneas de compra. Un grupo de revisión permite seguir el motivo de cada línea afectada.',
      ),
    ),
  );
  const reviewGroup = button(
    gloveGroup.pending
      ? t('Review these gloves using the material field', 'Revisar estos guantes según su material')
      : t('Glove review applied', 'Revisión de guantes aplicada'),
    'impact-review-group',
    () => {
      phase = 'v2';
      for (const m of gloveGroup.mappings) decisions[m.id] = suggestedDecision(m, updated);
      resetResults();
      renderImpact(language);
    },
  );
  reviewGroup.disabled = gloveGroup.pending === 0;
  example.append(reviewGroup);
  host.append(example);
  const finish = el('section', '', 'radar-finish');
  finish.append(
    el('p', t('THE OUTCOME', 'EL RESULTADO'), 'eyebrow'),
    el(
      'h2',
      t(
        'Recover the classification. Keep the exceptions.',
        'Recuperar la clasificación. Conservar las excepciones.',
      ),
    ),
  );
  finish.append(
    el(
      'p',
      t(
        'The complete example also contains retired categories, a merge and a hierarchy change. Applying its authored review decisions reclassifies 720 lines. Another 180 have no justified replacement: they remain visible in a separate review group.',
        'El caso completo incluye bajas, una fusión y un cambio de categoría. Al aplicar las decisiones del ejemplo, 720 líneas recuperan su clasificación. Otras 180 no tienen un sustituto justificado: siguen visibles en un grupo de revisión separado.',
      ),
    ),
  );
  finish.append(
    button(
      t('Apply all example review decisions', 'Aplicar todas las revisiones del ejemplo'),
      'impact-review-all',
      () => {
        phase = 'v2';
        fault = false;
        decisions = scenarioDecisions();
        resetResults();
        renderImpact(language);
      },
    ),
  );
  const invariant = el(
    'p',
    t(
      'All 8,640 purchase lines and their amounts are preserved. This is synthetic example data, not real company data or measured customer savings.',
      'Se conservan las 8.640 líneas de compra y sus importes. Son datos sintéticos de ejemplo: no datos reales de empresas ni ahorro medido en clientes.',
    ),
    'impact-invariant',
  );
  invariant.id = 'impact-invariant';
  finish.append(invariant);
  host.append(finish);
  const tech = el('details', '', 'impact-technical');
  tech.id = 'impact-technical';
  tech.open = technicalOpen;
  tech.append(
    el(
      'summary',
      t(
        'For technical reviewers: execute, inspect and validate',
        'Para revisión técnica: ejecutar, inspeccionar y validar',
      ),
    ),
  );
  tech.append(
    el(
      'h3',
      t(
        'Prove the report still accounts for every purchase',
        'Comprobar que el informe conserva todas las compras',
      ),
    ),
  );
  const execute = button(
    sqlBusy
      ? t('Executing SQLite…', 'Ejecutando SQLite…')
      : t('Execute SQL and compare with the graph', 'Ejecutar SQL y comparar con el grafo'),
    'impact-run-sql',
    async () => {
      const request = ++generation;
      sqlBusy = true;
      renderImpact(language);
      try {
        const { executeSQL } = await import('../../adapters/sqlite.ts');
        const result = await executeSQL(catalog, ds);
        const rows = (result[0]?.values ?? [])
          .map((r) => ({ id: String(r[0]), count: Number(r[1]), amountCents: Number(r[2]) }))
          .sort((a, b) => a.id.localeCompare(b.id));
        if (JSON.stringify(rows) !== JSON.stringify(analysis.byCategory))
          throw new Error('SQLite / graph mismatch');
        if (request === generation)
          sqlState = t(
            'SQLite executed on all 8,640 rows. Results match the graph, including integer cents and exceptions.',
            'SQLite ejecutado sobre las 8.640 filas. Coincide con el grafo, incluidos los céntimos y las excepciones.',
          );
      } catch (error) {
        if (request === generation)
          sqlState =
            t('Execution failed: ', 'Error de ejecución: ') +
            (error instanceof Error ? error.message : String(error));
      } finally {
        sqlBusy = false;
        renderImpact(language);
      }
    },
  );
  execute.disabled = sqlBusy || analysis.errors.length > 0;
  tech.append(execute);
  const status = el(
    'p',
    sqlState ||
      t(
        'SQL runs locally in bundled SQLite/WASM. No database server or paid API.',
        'SQL se ejecuta localmente con SQLite/WASM incluido en la aplicación. Sin servidor de base de datos ni API de pago.',
      ),
    'hint',
  );
  status.id = 'impact-sql-status';
  status.setAttribute('role', 'status');
  tech.append(status);
  const ids = [
    ...new Set([...original.byCategory.map((r) => r.id), ...analysis.byCategory.map((r) => r.id)]),
  ].sort();
  tech.append(
    table(
      [
        t('Category', 'Categoría'),
        t('Original lines', 'Líneas originales'),
        t('Current lines', 'Líneas actuales'),
      ],
      ids.map((id) => [
        label(id),
        original.byCategory.find((r) => r.id === id)?.count ?? 0,
        analysis.byCategory.find((r) => r.id === id)?.count ?? 0,
      ]),
    ),
  );
  tech.append(
    el('h3', t('Inspect another catalog change', 'Inspeccionar otro cambio del catálogo')),
  );
  const choices = el('div', '', 'impact-change-list');
  for (const group of changed.groups) {
    const b = button(label(group.change.id), 'change-' + group.change.id, () => {
      selected = group.change.id;
      renderImpact(language);
    });
    b.setAttribute('aria-pressed', String(selected === group.change.id));
    choices.append(b);
  }
  tech.append(choices);
  const group = changed.groups.find((g) => g.change.id === selected)!;
  const delta = diff(baseline, updated).find((c) => c.id === selected)!;
  tech.append(
    el(
      'p',
      t(
        `${group.mappings.length} mappings → ${group.records} purchase lines. Change type: ${delta.kind}.`,
        `${group.mappings.length} correspondencias → ${group.records} líneas de compra. Tipo de cambio: ${delta.kind}.`,
      ),
    ),
  );
  tech.append(
    table(
      [
        t('Mapping / supplier', 'Correspondencia / proveedor'),
        t('Evidence', 'Evidencia'),
        t('Current target', 'Destino actual'),
      ],
      group.mappings.map((m) => {
        const state = stateOf(m, catalog, ds);
        return [
          m.id + ' · ' + m.supplier,
          JSON.stringify(m.attributes),
          state.target ? label(state.target) : t('Set aside', 'Separada'),
        ];
      }),
    ),
  );
  tech.append(
    el('h3', t('Detect an invalid hierarchy', 'Detectar una jerarquía inválida')),
    button(t('Validate the current state', 'Validar el estado actual'), 'impact-validate', () => {
      validationShown = true;
      renderImpact(language);
    }),
    button(
      fault
        ? t('Repair hierarchy', 'Reparar jerarquía')
        : t('Inject a hierarchy cycle', 'Introducir un ciclo en la jerarquía'),
      'impact-fault',
      () => {
        fault = !fault;
        resetResults();
        renderImpact(language);
      },
    ),
  );
  if (validationShown) {
    const errors = validateData(catalog, ds);
    tech.append(
      el(
        'p',
        `${errors.length} ${t('structural/data errors', 'errores de estructura/datos')} · ${analysis.unresolvedMappings} ${t('unresolved classifications', 'clasificaciones sin resolver')}`,
        'impact-validation-status',
      ),
    );
    errors.slice(0, 6).forEach((error) => tech.append(el('p', error, 'impact-error')));
  }
  tech.append(
    el(
      'p',
      t(
        'Browser checks run on the current state. Full SHACL and OWL RL reasoning run in repository tests, not in the browser.',
        'El navegador comprueba el estado actual. SHACL completo y razonamiento OWL RL se ejecutan en los tests del repositorio, no en el navegador.',
      ),
      'hint',
    ),
  );
  tech.append(
    el(
      'h3',
      t(
        'The same reviewed facts, different tools',
        'Los mismos hechos revisados, distintas herramientas',
      ),
    ),
  );
  const tabs = el('div', '', 'impact-actions');
  for (const [key, name] of [
    ['rdf', 'RDF / SKOS'],
    ['owl', 'OWL / RDF/XML'],
    ['cypher', 'Neo4j / Cypher'],
    ['sql', 'SQLite'],
  ] as const) {
    const b = button(name, 'impact-tab-' + key, () => {
      codeTab = key;
      renderImpact(language);
    });
    b.setAttribute('aria-pressed', String(codeTab === key));
    tabs.append(b);
  }
  tech.append(tabs);
  const purpose = {
    rdf: t(
      'RDF/SKOS exchanges stable concepts, classifications and provenance.',
      'RDF/SKOS intercambia conceptos estables, clasificaciones y procedencia.',
    ),
    owl: t(
      'The same graph in RDF/XML, with explicit property semantics. SKOS transitivity is verified in tests.',
      'El mismo grafo en RDF/XML, con semántica explícita. La transitividad SKOS se verifica en tests.',
    ),
    cypher: t(
      'Cypher loads the same facts into Neo4j. Preview only: no Neo4j server is deployed.',
      'Cypher permite cargar los mismos hechos en Neo4j. Solo previsualización: no hay servidor Neo4j desplegado.',
    ),
    sql: t(
      'This recursive query really executes in SQLite/WASM on all purchase lines.',
      'Esta consulta recursiva se ejecuta en SQLite/WASM sobre todas las compras.',
    ),
  };
  tech.append(el('p', purpose[codeTab]));
  const pre = el('pre', '', 'impact-code'),
    code = el('code');
  code.textContent =
    codeTab === 'sql'
      ? 'SQL…'
      : serialize(
          graph(
            catalog,
            ds,
            group.mappings.map((m) => m.id),
            true,
          ),
        )[codeTab];
  pre.append(code);
  tech.append(pre);
  if (codeTab === 'sql')
    import('../../adapters/sqlite.ts').then(({ reportSQL }) => {
      if (code.isConnected) code.textContent = reportSQL;
    });
  tech.append(
    el(
      'p',
      t(
        'Code preview: full taxonomy plus the selected group (6 mappings / 180 lines). Analysis and SQL include all 288 mappings / 8,640 lines.',
        'Previsualización: taxonomía y grupo seleccionado (6 correspondencias / 180 líneas). Análisis y SQL incluyen las 288 correspondencias / 8.640 líneas.',
      ),
      'hint',
    ),
  );
  tech.append(
    el('h3', t('Sources and scope', 'Fuentes y alcance')),
    el(
      'p',
      t(
        'The catalog and version changes are authored examples. The common foundation is W3C SKOS for vocabularies, PROV-O for provenance, OWL for semantics and schema.org product types. There is no single domain ontology used by almost every team.',
        'El catálogo y sus cambios son ejemplos propios. La base común son SKOS del W3C para vocabularios, PROV-O para procedencia, OWL para semántica y tipos de producto schema.org. No existe una ontología de dominio que usen casi todos los equipos.',
      ),
    ),
  );
  const link = el(
    'a',
    t(
      'Data, decisions and reproducible checks on GitHub ↗',
      'Datos, decisiones y comprobaciones reproducibles en GitHub ↗',
    ),
  );
  link.href = 'https://github.com/beabustor/knowledge_engineer/tree/main/03-pipelines/01-impact';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  tech.append(link);
  const separate = el(
    'a',
    t(
      'Separate experiment: annotate text with public vocabularies ↗',
      'Experimento separado: anotar texto con vocabularios públicos ↗',
    ),
  );
  separate.href = '?view=annotation';
  tech.append(el('p'), separate);
  tech.append(
    el(
      'p',
      t(
        'Scenario reviews reset on reload. No production authentication, persistent team review store, measured customer savings or deployed Neo4j service.',
        'Las revisiones se reinician al recargar. Sin autenticación de producción, revisión persistente de equipo, ahorro medido en clientes ni Neo4j desplegado.',
      ),
      'hint',
    ),
  );
  host.append(tech);
}
