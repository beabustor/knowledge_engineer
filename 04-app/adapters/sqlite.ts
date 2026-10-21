/** SQLite actually executes in-browser via bundled WASM. No server or CDN. */
import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import {
  mappings,
  records,
  stateOf,
  type Catalog,
  type Decisions,
} from '../../03-pipelines/01-impact/engine.ts';
let engine: ReturnType<typeof initSqlJs> | undefined;
export const reportSQL = `WITH RECURSIVE ancestry(child,ancestor) AS (
 SELECT id,id FROM concept WHERE deprecated=0
 UNION
 SELECT a.child,b.parent FROM ancestry a JOIN broader b ON b.child=a.ancestor
 JOIN concept parent ON parent.id=b.parent WHERE parent.deprecated=0
), classified AS (
 SELECT m.id, CASE WHEN m.status!='valid' THEN m.status
 ELSE COALESCE((SELECT c.id FROM concept c JOIN broader b ON b.child=c.id
 JOIN ancestry a ON a.ancestor=c.id WHERE b.parent='Supplies' AND a.child=m.target),'uncategorized') END AS category
 FROM mapping m
)
SELECT c.category,COUNT(*) AS purchase_lines,SUM(p.amount_cents) AS amount_cents
FROM purchase p JOIN classified c ON c.id=p.mapping_id
GROUP BY c.category ORDER BY c.category;`;
export const pendingSQL = `SELECT m.id,m.supplier,m.target,m.status,COUNT(p.id) AS purchase_lines
FROM mapping m JOIN purchase p ON p.mapping_id=m.id
WHERE m.status!='valid' GROUP BY m.id ORDER BY m.status,m.id;`;
export async function executeSQL(catalog: Catalog, decisions: Decisions, query = reportSQL) {
  engine ??= initSqlJs({ locateFile: () => wasmUrl });
  const SQL = await engine;
  const db = new SQL.Database();
  try {
    db.run(
      'CREATE TABLE concept(id TEXT PRIMARY KEY,label_en TEXT,label_es TEXT,deprecated INTEGER);CREATE TABLE broader(child TEXT,parent TEXT);CREATE TABLE mapping(id TEXT PRIMARY KEY,supplier TEXT,target TEXT,status TEXT);CREATE TABLE purchase(id TEXT PRIMARY KEY,mapping_id TEXT,amount_cents INTEGER);BEGIN;',
    );
    const c = db.prepare('INSERT INTO concept VALUES(?,?,?,?)'),
      b = db.prepare('INSERT INTO broader VALUES(?,?)'),
      m = db.prepare('INSERT INTO mapping VALUES(?,?,?,?)'),
      p = db.prepare('INSERT INTO purchase VALUES(?,?,?)');
    try {
      for (const row of catalog.concepts) {
        c.run([row.id, row.labels.en, row.labels.es, row.deprecated ? 1 : 0]);
        for (const parent of row.broader) b.run([row.id, parent]);
      }
      for (const row of mappings) {
        const state = stateOf(row, catalog, decisions);
        m.run([row.id, row.supplier, state.target, state.status]);
      }
      for (const row of records) p.run([row.id, row.mapping, row.amountCents]);
    } finally {
      c.free();
      b.free();
      m.free();
      p.free();
    }
    db.run('COMMIT;');
    return db.exec(query);
  } finally {
    db.close();
  }
}
