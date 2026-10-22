/** Responsive diagrams: readable HTML labels and local SVG illustrations, no remote assets. */
import type { Lang } from '../../../03-pipelines/01-impact/engine.ts';
export function icon(kind: 'glove' | 'supplier' | 'report', label: string) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 80 80');
  svg.setAttribute('class', 'case-icon');
  svg.setAttribute('aria-hidden', 'true');
  const shapes =
    kind === 'glove'
      ? [
          'M24 69 14 45Q11 38 17 37L27 46 25 19Q25 12 31 14L35 36 34 10Q35 4 40 10L43 35 45 13Q47 8 51 14L51 38 56 24Q60 18 64 24L61 49Q60 62 51 69Z',
        ]
      : kind === 'supplier'
        ? ['M12 30 40 13 68 30 68 66 12 66Z', 'M12 30 40 47 68 30M40 47 40 66M26 22 54 39']
        : ['M19 10 61 10 61 70 19 70Z', 'M28 25H52M28 36H52M28 47H44M28 58H47'];
  for (const d of shapes) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', kind === 'glove' ? 'currentColor' : 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
  }
  svg.setAttribute('data-drawing', label);
  return svg;
}
const node = (text: string, detail: string, cls = '') => {
  const box = document.createElement('div');
  box.className = 'case-node ' + cls;
  const strong = document.createElement('strong');
  strong.textContent = text;
  const p = document.createElement('span');
  p.textContent = detail;
  box.append(strong, p);
  return box;
};
export function flowDiagram(lang: Lang, state: 'before' | 'broken' | 'resolved') {
  const es = lang === 'es';
  const diagram = document.createElement('figure');
  diagram.className = 'case-flow';
  diagram.setAttribute(
    'aria-label',
    es ? 'Productos, catálogo e informe de compras' : 'Products, catalog and purchase report',
  );
  const sources = document.createElement('div');
  sources.className = 'case-suppliers';
  for (const name of ['Atlas Lab', 'Boreal Supply', 'Cobalt Science'])
    sources.append(node(name, es ? '2 productos' : '2 products', 'source'));
  const arrow = () => {
    const e = document.createElement('div');
    e.className = 'flow-arrow';
    e.textContent = '↓';
    e.setAttribute('aria-hidden', 'true');
    return e;
  };
  diagram.append(sources, arrow());
  if (state === 'before')
    diagram.append(
      node(
        es ? 'Guante de protección' : 'Protective glove',
        es ? 'Una categoría compartida' : 'One shared category',
        'catalog',
      ),
    );
  else {
    if (state === 'broken')
      diagram.append(
        node(
          es ? 'Categoría antigua retirada' : 'Old category retired',
          es ? '6 enlaces necesitan una decisión' : '6 links need a decision',
          'broken',
        ),
      );
    const branches = document.createElement('div');
    branches.className = 'case-branches';
    branches.append(
      node(
        es ? 'Nitrilo' : 'Nitrile',
        state === 'resolved'
          ? es
            ? '90 líneas'
            : '90 lines'
          : es
            ? '¿Qué productos?'
            : 'Which products?',
        'nitrile',
      ),
      node(
        es ? 'Látex' : 'Latex',
        state === 'resolved'
          ? es
            ? '90 líneas'
            : '90 lines'
          : es
            ? '¿Qué productos?'
            : 'Which products?',
        'latex',
      ),
    );
    diagram.append(branches);
  }
  diagram.append(
    arrow(),
    node(
      state === 'broken'
        ? es
          ? '180 líneas pendientes'
          : '180 lines pending'
        : es
          ? '180 líneas conservadas'
          : '180 lines preserved',
      state === 'broken'
        ? es
          ? 'El informe no puede agruparlas correctamente'
          : 'The report cannot group them correctly'
        : state === 'resolved'
          ? es
            ? 'Informe por material, sin perder compras'
            : 'Report by material, with no lost purchases'
          : es
            ? 'El informe solo dice «guantes»'
            : 'The report only says “gloves”',
      state === 'broken' ? 'broken' : 'report',
    ),
  );
  return diagram;
}
