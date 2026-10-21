import { parseCsv } from '../../02-model/csv.ts';
import type { Concept } from '../../02-model/model.ts';
export function conceptsFromRows(rows: unknown[][], base: Concept[], sourceUrl: string): Concept[] {
  if (rows.length > 30000) throw new Error('Maximum 30000 rows / Máximo 30000 filas');
  const header = (rows[0] ?? []).map((x) => String(x).trim().toLowerCase());
  const pairs: [number, number][] = [];
  for (const name of ['cod_3', 'cod_4']) {
    const i = header.indexOf(name);
    if (i >= 0) pairs.push([i, i + 1]);
  }
  if (!pairs.length) {
    const i = header.indexOf('code'),
      j = header.indexOf('description');
    if (i >= 0 && j >= 0) pairs.push([i, j]);
  }
  if (!pairs.length) throw new Error('Columns: COD_3 / COD_4 or code / description');
  const out: Concept[] = [];
  const seen = new Set<string>();
  rows.slice(1).forEach((row, index) =>
    pairs.forEach(([ci, li]) => {
      let code = String(row[ci] ?? '')
        .trim()
        .toUpperCase();
      const label = String(row[li] ?? '').trim();
      if (/^[A-Z]\d{3,5}$/.test(code)) code = code.slice(0, 3) + '.' + code.slice(3);
      if (!/^[A-Z]\d{2}(\.\d[A-Z0-9]*)?$/.test(code) || !label || seen.has(code)) return;
      seen.add(code);
      const existing = base.find((c) => c.domain === 'clinical' && c.code === code);
      out.push({
        id: 'Imported_' + code.replace('.', '_'),
        domain: 'clinical',
        labels: { en: existing?.labels.en ?? code, es: label },
        aliases: { en: existing?.aliases.en ?? [], es: [label, ...(existing?.aliases.es ?? [])] },
        code,
        source: 'User-selected CIE-10 spreadsheet / Hoja CIE-10 seleccionada',
        version: `Source row / Fila ${index + 2}; edition unverified / edición sin verificar`,
        url: sourceUrl,
        status: 'imported',
      });
    }),
  );
  for (const c of out) {
    const parent = c.code!.split('.')[0];
    if (c.code!.includes('.') && seen.has(parent)) c.parent = 'Imported_' + parent;
  }
  if (!out.length) throw new Error('No valid ICD-10 codes found / Sin códigos CIE-10 válidos');
  return out;
}
export async function readCatalogFile(
  bytes: ArrayBuffer,
  name: string,
  base: Concept[],
  url: string,
): Promise<Concept[]> {
  if (bytes.byteLength > 8_000_000) throw new Error('Maximum 8 MB / Máximo 8 MB');
  if (name.toLowerCase().endsWith('.csv'))
    return conceptsFromRows(parseCsv(new TextDecoder().decode(bytes)), base, url);
  const XLSX = await import('@e965/xlsx');
  const book = XLSX.read(bytes, { type: 'array', sheetRows: 30001 });
  const sheet = book.Sheets[book.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  return conceptsFromRows(rows, base, url);
}
