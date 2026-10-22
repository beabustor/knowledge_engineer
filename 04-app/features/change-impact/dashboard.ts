/** Four-step business journey. Every action changes the visible step or gives inline feedback. */
import type { Decisions, Lang } from '../../../03-pipelines/01-impact/engine.ts';
import {
  baseline,
  updated,
  caseMappings,
  caseRecords,
  caseSummary,
  reviewMaterial,
  caseReportSQL,
  targetFor,
  type Material,
} from '../../../03-pipelines/01-impact/glove-case.ts';
import { graph, serialize } from '../../../03-pipelines/01-impact/representations.ts';
import { icon, flowDiagram } from './diagrams.ts';
let step = 0;
let lang: Lang = 'es';
let choices: Partial<Record<Material, string>> = {};
let decisions: Decisions = {};
let feedback: '' | 'correct' | 'wrong' | 'missing' = '';
let sqlBusy = false;
let sqlMessage: '' | 'loading' | 'verified' | 'error' = '';
let sqlError = '';
let sqlRows: { id: string; count: number; amountCents: number }[] = [];
let request = 0;
let proofOpen = false;
const t = (en: string, es: string) => (lang === 'es' ? es : en);
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') => {
  const e = document.createElement(tag);
  e.textContent = text;
  e.className = cls;
  return e;
};
const names = (id: string) =>
  ({
    NitrileGlove: t('Nitrile', 'Nitrilo'),
    LatexGlove: t('Latex', 'Látex'),
    ProtectiveGlove: t('Gloves, unspecified material', 'Guantes, sin separar por material'),
    unresolved: t('Needs review', 'Pendiente de revisión'),
  })[id] ?? id;
const button = (text: string, id: string, action: () => void, cls = 'case-button') => {
  const b = el('button', text, cls);
  b.type = 'button';
  b.id = id;
  b.onclick = action;
  return b;
};
function move(next: number) {
  request++;
  sqlBusy = false;
  sqlRows = [];
  sqlMessage = '';
  step = next;
  feedback = '';
  proofOpen = false;
  renderImpact(lang);
  const h = document.getElementById('case-heading')!;
  h.focus({ preventScroll: true });
  document.getElementById('impact-workbench')!.scrollIntoView({ block: 'start', behavior: 'auto' });
}
function choose(material: Material, target: string) {
  choices[material] = target;
  feedback = target === targetFor[material] ? 'correct' : 'wrong';
  renderImpact(lang);
  document
    .querySelector<HTMLButtonElement>(`[data-material="${material}"][data-target="${target}"]`)
    ?.focus({ preventScroll: true });
}
export function renderImpact(language: Lang) {
  lang = language;
  const host = document.getElementById('impact-workbench')!;
  const previous = host.querySelector<HTMLDetailsElement>('#case-proof');
  if (previous && step === 3) proofOpen = previous.open;
  host.replaceChildren();
  const header = el('div', '', step > 0 ? 'case-context compact' : 'case-context');
  header.append(
    el('p', t('A PURCHASE TEAM’S PROBLEM', 'EL PROBLEMA DE UN EQUIPO DE COMPRAS'), 'eyebrow'),
    el(
      'h1',
      t(
        'The catalog changed. Which purchases need fixing?',
        'Cambió el catálogo. ¿Qué compras hay que revisar?',
      ),
    ),
  );
  header.append(
    el(
      'p',
      t(
        '“We need to distinguish nitrile and latex purchases without checking every purchase by hand.”',
        '«Necesitamos distinguir las compras de nitrilo y látex sin revisar cada compra a mano».',
      ),
    ),
  );
  host.append(header);
  const progress = el('ol', '', 'case-progress');
  const labels = [
    t('Before', 'Antes'),
    t('Change', 'Cambio'),
    t('Decide', 'Decidir'),
    t('Result', 'Resultado'),
  ];
  labels.forEach((label, index) => {
    const li = el('li');
    if (index === step) li.setAttribute('aria-current', 'step');
    if (index < step) li.classList.add('done');
    li.append(el('span', String(index + 1)), el('strong', label));
    progress.append(li);
  });
  progress.setAttribute('aria-label', t('Progress', 'Progreso'));
  host.append(progress);
  const panel = el('section', '', 'case-stage');
  panel.id = 'case-stage';
  const title = [
    t('One shared category: “gloves”.', 'Una categoría común: «guantes».'),
    t(
      'Two new categories. Six links to review.',
      'Dos categorías nuevas. Seis enlaces que revisar.',
    ),
    t('Use the supplier’s evidence to decide.', 'Decide con el dato del proveedor.'),
    t('You can now report purchases by material.', 'Ya puedes comparar las compras por material.'),
  ][step];
  const heading = el('h2', title);
  heading.id = 'case-heading';
  heading.tabIndex = -1;
  panel.append(
    el('p', t(`STEP ${step + 1} OF 4`, `PASO ${step + 1} DE 4`), 'case-step-label'),
    heading,
  );
  if (step === 0) {
    panel.append(
      el(
        'p',
        t(
          'Three suppliers sell six glove products. Their 180 purchase lines point to the same catalog category. The report cannot separate nitrile from latex.',
          'Tres proveedores venden seis productos de guantes. Sus 180 líneas de compra apuntan a la misma categoría del catálogo. El informe no distingue nitrilo de látex.',
        ),
      ),
    );
    panel.append(flowDiagram(lang, 'before'));
    panel.append(
      el(
        'p',
        t(
          'The supplier already tells us the material. That evidence will let us update six product links instead of opening 180 purchases.',
          'El proveedor ya indica el material. Ese dato permite actualizar seis enlaces de producto en lugar de abrir 180 compras.',
        ),
        'case-takeaway',
      ),
    );
  } else if (step === 1) {
    panel.append(
      el(
        'p',
        t(
          'The new catalog retires “protective glove” and introduces “nitrile glove” and “latex glove”. The app traces the retired category to six supplier products, then to 180 purchase lines. It does not guess a replacement.',
          'El nuevo catálogo retira «guante de protección» y crea «guante de nitrilo» y «guante de látex». La aplicación sigue la categoría retirada hasta seis productos de proveedores y sus 180 líneas de compra. No elige un sustituto por su cuenta.',
        ),
      ),
    );
    panel.append(flowDiagram(lang, 'broken'));
    const evidence = el('div', '', 'case-impact-count');
    evidence.append(
      el('strong', String(caseMappings.length)),
      el(
        'span',
        t(
          'product links to review → 180 dependent purchase lines',
          'enlaces de producto que revisar → 180 líneas de compra dependientes',
        ),
      ),
    );
    panel.append(evidence);
  } else if (step === 2) {
    panel.append(
      el(
        'p',
        t(
          'Review two material groups. Each decision applies to three supplier products and 90 purchase lines. Choose a category for each group.',
          'Revisa dos grupos de material. Cada decisión se aplica a tres productos de proveedores y 90 líneas de compra. Elige una categoría para cada grupo.',
        ),
      ),
    );
    for (const material of ['nitrile', 'latex'] as Material[]) {
      const card = el('section', '', 'case-decision ' + material);
      card.append(
        icon('glove', material),
        el(
          'h3',
          t('Supplier says: ', 'El proveedor indica: ') +
            (material === 'nitrile' ? t('NITRILE', 'NITRILO') : t('LATEX', 'LÁTEX')),
        ),
        el(
          'p',
          t(
            'Which category should these products use?',
            '¿Qué categoría corresponde a estos productos?',
          ),
        ),
      );
      const actions = el('div', '', 'case-choices');
      for (const target of ['NitrileGlove', 'LatexGlove']) {
        const b = button(names(target), `choice-${material}-${target}`, () =>
          choose(material, target),
        );
        b.dataset.material = material;
        b.dataset.target = target;
        b.setAttribute('aria-pressed', String(choices[material] === target));
        actions.append(b);
      }
      card.append(actions);
      if (choices[material]) {
        const correct = choices[material] === targetFor[material];
        card.append(
          el(
            'p',
            correct
              ? t('✓ Matches the supplier evidence', '✓ Coincide con el dato del proveedor')
              : t(
                  '✕ Does not match the supplier evidence',
                  '✕ No coincide con el dato del proveedor',
                ),
            correct ? 'choice-correct' : 'choice-wrong',
          ),
        );
      }
      panel.append(card);
    }
  } else {
    const after = caseSummary(updated, decisions);
    const overview = el('div', '', 'case-success');
    overview.append(
      el('strong', t('180 purchase lines classified', '180 líneas de compra clasificadas')),
      el(
        'p',
        t(
          '6 product links updated · 0 purchases deleted',
          '6 enlaces de producto actualizados · 0 compras borradas',
        ),
      ),
    );
    panel.append(overview);
    panel.append(flowDiagram(lang, 'resolved'));
    const result = el('section', '', 'case-report');
    result.id = 'case-result';
    result.append(
      icon('report', 'purchase report'),
      el('h3', t('The purchasing team’s report', 'El informe del equipo de compras')),
    );
    for (const row of after.rows) {
      const line = el('div', '', 'case-report-row');
      line.append(
        el('strong', names(row.id)),
        el('span', `${row.count} ${t('purchase lines', 'líneas de compra')}`),
      );
      const track = el('div', '', 'case-bar');
      const fill = el(
        'div',
        '',
        'case-bar-fill ' + (row.id === 'NitrileGlove' ? 'nitrile' : 'latex'),
      );
      fill.style.width = `${(row.count / after.total) * 100}%`;
      track.append(fill);
      result.append(line, track);
    }
    result.append(
      el(
        'p',
        t(
          'Before: one undifferentiated category. Now: 90 nitrile lines and 90 latex lines, with the original amounts preserved.',
          'Antes: una categoría sin separar. Ahora: 90 líneas de nitrilo y 90 de látex, conservando los importes originales.',
        ),
      ),
    );
    panel.append(result);
    panel.append(
      el(
        'p',
        t(
          'The useful result: review the six affected links once, update all 180 dependent lines, and retain the reason for every decision. This example does not measure real customer time savings.',
          'El resultado útil: revisar una vez los seis enlaces afectados, actualizar las 180 líneas dependientes y conservar el motivo de cada decisión. Este ejemplo no mide ahorro real de tiempo en clientes.',
        ),
        'case-takeaway',
      ),
    );
  }
  const feedbackText = {
    correct: t(
      'The category matches the supplier material.',
      'La categoría coincide con el material del proveedor.',
    ),
    wrong: t(
      'This does not match the supplier material. Check the evidence above.',
      'No coincide con el material del proveedor. Revisa el dato que aparece encima.',
    ),
    missing: t(
      'Choose the category that matches each material before continuing.',
      'Elige la categoría que coincide con cada material antes de continuar.',
    ),
    '': '',
  }[feedback];
  const alert = el('p', feedbackText, 'case-feedback');
  alert.id = 'case-feedback';
  alert.setAttribute('role', 'status');
  panel.append(alert);
  const actions = el('div', '', 'case-navigation');
  if (step > 0)
    actions.append(
      button(t('← Back', '← Atrás'), 'case-back', () => move(step - 1), 'case-button secondary'),
    );
  if (step < 3) {
    const text = [
      t('Update the catalog →', 'Actualizar el catálogo →'),
      t('Review the six links →', 'Revisar los seis enlaces →'),
      t('Apply decisions and see the report →', 'Aplicar decisiones y ver el informe →'),
    ][step];
    actions.append(
      button(
        text,
        'case-next',
        () => {
          if (step < 2) {
            move(step + 1);
            return;
          }
          if (choices.nitrile !== 'NitrileGlove' || choices.latex !== 'LatexGlove') {
            feedback = 'missing';
            renderImpact(lang);
            document.getElementById('case-feedback')!.scrollIntoView({ block: 'center' });
            return;
          }
          decisions = reviewMaterial(
            reviewMaterial({}, 'nitrile', choices.nitrile),
            'latex',
            choices.latex,
          );
          request++;
          sqlRows = [];
          sqlMessage = '';
          move(3);
        },
        'case-button primary',
      ),
    );
  } else
    actions.append(
      button(
        t('Try again from the beginning', 'Volver a probar desde el principio'),
        'case-reset',
        () => {
          choices = {};
          decisions = {};
          request++;
          sqlRows = [];
          sqlMessage = '';
          sqlBusy = false;
          move(0);
        },
        'case-button secondary',
      ),
    );
  panel.append(actions);
  host.append(panel);
  const note = el(
    'p',
    t(
      'Interactive example with fictional suppliers and purchase data. No paid services or uploads.',
      'Ejemplo interactivo con proveedores y compras ficticios. Sin servicios de pago ni subida de datos.',
    ),
    'case-scenario-note',
  );
  host.append(note);
  if (step === 3) host.append(proof());
}
function proof() {
  const details = el('details', '', 'case-proof');
  details.id = 'case-proof';
  details.open = proofOpen;
  details.ontoggle = () => {
    proofOpen = details.open;
  };
  details.append(
    el(
      'summary',
      t('Technical evidence for this exact result', 'Evidencia técnica de este mismo resultado'),
    ),
  );
  details.append(
    el('h3', t('1. Trace the six decisions', '1. Seguir las seis decisiones')),
    el(
      'p',
      t(
        'These are the actual fixture SKUs and review targets, not a second example. Each SKU has 30 purchase lines.',
        'Estos son los SKU del ejemplo y sus destinos revisados; no es otro caso. Cada SKU tiene 30 líneas de compra.',
      ),
    ),
  );
  const list = el('ul', '', 'case-source-list');
  for (const m of caseMappings) {
    const item = el('li');
    item.append(
      el('strong', `${m.supplier} · ${m.sku}`),
      el(
        'span',
        `${t('Material', 'Material')}: ${m.attributes.material === 'nitrile' ? names('NitrileGlove') : names('LatexGlove')} → ${names(decisions[m.id]?.target ?? m.target)}`,
      ),
      el('code', `${m.id} · demo-reviewer`),
    );
    list.append(item);
  }
  details.append(list);
  const summary = caseSummary(updated, decisions);
  const original = caseSummary(baseline);
  const checks = el('ul', '', 'case-checks');
  for (const [valid, text] of [
    [
      summary.total === original.total,
      t('180 purchase lines preserved', '180 líneas de compra conservadas'),
    ],
    [
      summary.totalCents === original.totalCents,
      t('Original total amount preserved', 'Importe total original conservado'),
    ],
    [
      summary.materialCorrect,
      t(
        'All six categories match supplier material',
        'Las seis categorías coinciden con el material del proveedor',
      ),
    ],
  ] as const)
    checks.append(el('li', (valid ? '✓ ' : '✕ ') + text));
  details.append(checks);
  details.append(
    el(
      'h3',
      t('2. Execute an independent SQL check', '2. Ejecutar una comprobación SQL independiente'),
    ),
  );
  const run = button(
    sqlBusy
      ? t('Running SQLite…', 'Ejecutando SQLite…')
      : t('Run SQL on these 180 lines', 'Ejecutar SQL sobre estas 180 líneas'),
    'case-run-sql',
    async () => {
      const token = ++request;
      sqlBusy = true;
      sqlMessage = 'loading';
      renderImpact(lang);
      try {
        const { executeSQL } = await import('../../adapters/sqlite.ts');
        const result = await executeSQL(updated, decisions, caseReportSQL);
        if (token !== request) return;
        const actual = (result[0]?.values ?? [])
          .map((r) => ({ id: String(r[0]), count: Number(r[1]), amountCents: Number(r[2]) }))
          .sort((a, b) => a.id.localeCompare(b.id));
        if (JSON.stringify(actual) !== JSON.stringify(caseSummary(updated, decisions).rows))
          throw new Error('SQL / graph mismatch');
        sqlRows = actual;
        sqlMessage = 'verified';
      } catch (error) {
        if (token === request) {
          sqlMessage = 'error';
          sqlError = error instanceof Error ? error.message : String(error);
        }
      } finally {
        if (token === request) {
          sqlBusy = false;
          renderImpact(lang);
        }
      }
    },
  );
  run.disabled = sqlBusy;
  details.append(run);
  const sqlText = {
    '': '',
    loading: t(
      'Loading local SQLite and querying the source records…',
      'Cargando SQLite local y consultando los registros de origen…',
    ),
    verified: t(
      'Verified: SQL independently returns the same 90 + 90 lines and the same amounts.',
      'Verificado: SQL devuelve de forma independiente las mismas 90 + 90 líneas y los mismos importes.',
    ),
    error: t('Check failed: ', 'Error de comprobación: ') + sqlError,
  }[sqlMessage];
  const status = el('p', sqlText, 'case-sql-status');
  status.id = 'case-sql-status';
  status.setAttribute('role', 'status');
  details.append(status);
  if (sqlRows.length) {
    const output = el('ul', '', 'case-query-results');
    for (const row of sqlRows)
      output.append(
        el(
          'li',
          `${names(row.id)}: ${row.count} ${t('lines', 'líneas')} · ${row.amountCents} ${t('integer cents', 'céntimos enteros')}`,
        ),
      );
    details.append(output);
  }
  const query = el('details');
  query.append(
    el('summary', t('Inspect the query that actually ran', 'Ver la consulta que se ejecuta')),
  );
  const sql = el('pre');
  sql.append(el('code', caseReportSQL));
  query.append(sql);
  details.append(query);
  details.append(
    el(
      'h3',
      t(
        '3. Inspect the same decisions in standard formats',
        '3. Inspeccionar las mismas decisiones en formatos estándar',
      ),
    ),
    el(
      'p',
      t(
        'Each view is generated from the same six mappings and their source evidence. These are representations, not separate applications.',
        'Cada vista se genera con las mismas seis correspondencias y su evidencia. Son representaciones, no aplicaciones distintas.',
      ),
    ),
  );
  const outputs = serialize(
    graph(
      updated,
      decisions,
      caseMappings.map((m) => m.id),
      true,
    ),
  );
  for (const [key, title, explanation] of [
    [
      'rdf',
      'RDF / SKOS',
      t('Portable identifiers and relationships.', 'Identificadores y relaciones intercambiables.'),
    ],
    [
      'owl',
      'OWL / RDF/XML',
      t(
        'The same facts in RDF/XML with explicit ontology semantics.',
        'Los mismos hechos en RDF/XML con semántica ontológica explícita.',
      ),
    ],
    [
      'cypher',
      'Neo4j / Cypher',
      t(
        'Load these facts into Neo4j. Preview only; no Neo4j server is running.',
        'Permite cargar estos hechos en Neo4j. Solo previsualización; no hay servidor Neo4j activo.',
      ),
    ],
  ] as const) {
    const format = el('details');
    format.append(el('summary', title), el('p', explanation));
    const pre = el('pre');
    pre.append(el('code', outputs[key]));
    format.append(pre);
    details.append(format);
  }
  details.append(
    el(
      'p',
      t(
        'Scope: this case uses 6 mappings and 180 lines from an 8,640-line synthetic regression dataset. It does not claim that unrelated catalog changes have been resolved. Current decisions reset on reload. Full SHACL and SKOS reasoning run in repository tests, not in the browser.',
        'Alcance: este caso usa 6 correspondencias y 180 líneas de un conjunto sintético de pruebas de 8.640 líneas. No afirma haber resuelto otros cambios del catálogo. Las decisiones se reinician al recargar. SHACL completo y razonamiento SKOS se ejecutan en los tests, no en el navegador.',
      ),
    ),
  );
  const a = el(
    'a',
    t(
      'Open the reproducible data and tests on GitHub ↗',
      'Ver datos y pruebas reproducibles en GitHub ↗',
    ),
  );
  a.href = 'https://github.com/beabustor/knowledge_engineer/tree/main/05-validation/04-impact';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  details.append(a);
  return details;
}
