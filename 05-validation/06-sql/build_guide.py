"""Generate EN/ES SQL walkthroughs and saved outputs from executed queries, not invented tables."""
import hashlib,html,importlib.util,json,sqlite3,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent;SQL=ROOT/'03-pipelines/03-sql'
spec=importlib.util.spec_from_file_location('sql_checks',HERE/'verify.py');checks=importlib.util.module_from_spec(spec);spec.loader.exec_module(checks)
# file, EN title, ES title, EN logic, ES logic, parameters
CASES=[
 ('01-basic/01-filter.sql','Inspect a product','Inspeccionar un producto','WHERE selects one product and department; parameters are bound, not concatenated; ORDER BY makes LIMIT stable.','WHERE elige producto y departamento; los parámetros se vinculan, no se concatenan; ORDER BY hace estable LIMIT.',{'department':'Research','mapping_id':'M0001','row_limit':100}),
 ('02-intermediate/01-supplier-spend.sql','Reconcile supplier spend','Cuadrar gasto por proveedor','Join each purchase to exactly one product, then one supplier. GROUP BY reduces rows only after the joins; HAVING filters the aggregate.','Cada compra se une a un producto y después a un proveedor. GROUP BY agrega después de los joins; HAVING filtra el agregado.',{'minimum_cents':0}),
 ('02-intermediate/02-review-queue.sql','Find broken classifications','Localizar clasificaciones rotas','NOT EXISTS checks whether the target is active in v2. Only then aggregate dependent purchases. No inactive target is silently replaced.','NOT EXISTS comprueba si el destino sigue activo en v2. Después se agregan sus compras; no se sustituye automáticamente un destino retirado.',{'release':'scenario-v2'}),
 ('03-advanced/01-monthly-windows.sql','Compare calendar months','Comparar meses de calendario','monthly aggregates at supplier/month grain; filled adds missing months; LAG reads the previous calendar month; SUM OVER accumulates with explicit ROWS; zero denominators return NULL.','monthly agrega proveedor/mes; filled completa meses vacíos; LAG lee el mes anterior de calendario; SUM OVER acumula con ROWS explícito; el denominador cero produce NULL.',{}),
 ('03-advanced/02-prioritize-impact.sql','Prioritize review work','Priorizar el trabajo de revisión','inactive identifies broken mappings; exposure aggregates their cents; DENSE_RANK preserves exposure ties; ROW_NUMBER orders each supplier queue with an ID tie-break.','inactive identifica correspondencias rotas; exposure suma sus céntimos; DENSE_RANK conserva empates; ROW_NUMBER ordena cada cola por proveedor con desempate por identificador.',{'release':'scenario-v2'}),
 ('03-advanced/03-taxonomy-spend.sql','Follow taxonomy dependencies','Recorrer dependencias del catálogo','The recursive CTE discovers unique child/ancestor pairs. EXISTS includes each purchase once even if the taxonomy has several paths.','La CTE recursiva descubre pares hijo/ancestro únicos. EXISTS incluye cada compra una sola vez aunque existan varios caminos.',{'release':'scenario-v1','category':'Supplies'}),
 ('03-advanced/04-deduplicate-events.sql','Keep the latest decision','Conservar la última decisión','ROW_NUMBER partitions events by mapping and orders timestamp DESC then event_id DESC. The second ordering makes equal timestamps deterministic.','ROW_NUMBER separa eventos por correspondencia y ordena por fecha e identificador descendentes. El segundo criterio resuelve empates de forma determinista.',{}),
 ('03-advanced/05-review-transaction.sql','Apply one atomic review','Aplicar una revisión atómica','SAVEPOINT opens a review batch. A parameterized upsert inserts or updates the decision; RELEASE commits this savepoint. Caller rollback is independently verified for a failing batch.','SAVEPOINT abre el lote. El upsert vinculado inserta o actualiza la decisión; RELEASE cierra el savepoint. El verificador prueba aparte el rollback de un lote inválido.',{'mapping_id':'M0001','release':'scenario-v2','target':'Water','actor':'example-reviewer','reason':'Synthetic documentary example'})]

def mdtable(rows):
 if not rows:return '_0 rows / 0 filas._'
 keys=list(rows[0]);clean=lambda v:'NULL' if v is None else str(v).replace('|','\\|').replace('\n',' ')
 return '| '+' | '.join(keys)+' |\n| '+' | '.join('---' for _ in keys)+' |\n'+'\n'.join('| '+' | '.join(clean(r[k]) for k in keys)+' |' for r in rows[:5])

def build():
 db,*_=checks.load();panels=[]
 # A schema output means loaded table counts, not a pretend SELECT result of DDL.
 tables=['supplier','dim_month','concept','broader','product_mapping','purchase','review_decision']
 (SQL/'schema.output.json').write_text(json.dumps({'status':'Executed SQLite schema + frozen fixture load','tables':{t:db.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0] for t in tables}},indent=2)+'\n')
 for index,(file,en,es,logic_en,logic_es,params) in enumerate(CASES,1):
  code=(SQL/file).read_text()
  if 'deduplicate' in file:
   db.executescript('CREATE TABLE mapping_event(event_id INTEGER PRIMARY KEY,mapping_id TEXT,target TEXT,event_time TEXT);')
   db.executemany('INSERT INTO mapping_event VALUES(?,?,?,?)',[(1,'M0001','Old','2026-01-01'),(2,'M0001','First','2026-02-01'),(3,'M0001','Latest','2026-02-01')])
  if 'transaction' in file:
   for statement in code.split(';'):
    if statement.strip():db.execute(statement,params)
   rows=[dict(r) for r in db.execute('SELECT * FROM review_decision ORDER BY mapping_id,version')]
  else:rows=checks.query(db,file,params)
  output={'execution':'Actual local SQLite execution on synthetic project fixtures','sqlite_version':sqlite3.sqlite_version,'parameters':params,'query_sha256':hashlib.sha256(code.encode()).hexdigest(),'row_count':len(rows),'rows':rows}
  path=(SQL/file).with_suffix('.output.json');path.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
  panels.append({'id':f'q{index:02d}','file':file,'en':en,'es':es,'logic_en':logic_en,'logic_es':logic_es,'code':code,'output':str(path.relative_to(SQL)),**output})
 # Extract the exact public-demo SQL and decisions. Avoid a documentary copy drifting from the UI.
 script="""import {caseReportSQL,reviewMaterial} from './03-pipelines/01-impact/glove-case.ts';const d=reviewMaterial(reviewMaterial({},'nitrile','NitrileGlove','2026-01-01T00:00:00Z'),'latex','LatexGlove','2026-01-01T00:00:00Z');console.log(JSON.stringify({sql:caseReportSQL,decisions:Object.values(d)}));"""
 guided=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=ROOT,text=True))
 for d in guided['decisions']:db.execute('INSERT OR REPLACE INTO review_decision VALUES(?,?,?,?,?)',(d['mapping'],'scenario-v2',d['target'],d['actor'],d['reason']))
 db.executescript("""CREATE TEMP VIEW mapping AS SELECT m.id,COALESCE(d.target,m.target) AS target,CASE WHEN c.id IS NOT NULL AND c.deprecated=0 THEN 'valid' ELSE 'unresolved' END AS status FROM product_mapping m LEFT JOIN review_decision d ON d.mapping_id=m.id AND d.version='scenario-v2' LEFT JOIN concept c ON c.id=COALESCE(d.target,m.target) AND c.version='scenario-v2';""")
 # The UI's purchase table calls this column mapping_id, which the teaching schema also uses.
 rows=[dict(r) for r in db.execute(guided['sql'])];assert sum(r['purchase_lines'] for r in rows)==180
 demo={'id':'demo','file':'../../03-pipelines/01-impact/glove-case.ts','en':'The exact 180-line public demo query','es':'La consulta exacta de las 180 líneas de la demo','logic_en':'The exact exported SQL is run with a mapping view projecting the same six reviewed decisions. The six SKU filter prevents unrelated changes entering this result.','logic_es':'Se ejecuta el SQL exportado del código de la demo con una vista que refleja las mismas seis decisiones. El filtro de seis SKU excluye los otros cambios.','code':guided['sql'],'execution':'Actual SQLite execution of the exported public-demo SQL; schema adapter is documented in build_guide.py','parameters':{},'query_sha256':hashlib.sha256(guided['sql'].encode()).hexdigest(),'row_count':len(rows),'rows':rows,'output':'guided-case.output.json'}
 (SQL/demo['output']).write_text(json.dumps({k:v for k,v in demo.items() if k not in ['en','es','logic_en','logic_es']},indent=2)+'\n');panels.insert(0,demo)
 plan=json.loads((HERE/'report.json').read_text())['query_plan'];(SQL/'indexes.output.json').write_text(json.dumps({'execution':'Actual EXPLAIN QUERY PLAN from verify.py','result_unchanged':True,**plan},indent=2)+'\n')
 reference=[dict(r) for r in db.execute("""WITH monthly AS (SELECT mapping_id,month||'-01' AS month,SUM(amount_cents) AS amount_cents FROM purchase WHERE month>='2026-01' AND month<'2026-07' GROUP BY mapping_id,month) SELECT *,SUM(amount_cents) OVER(PARTITION BY mapping_id ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_cents FROM monthly ORDER BY mapping_id,month""")]
 for engine in ['bigquery','snowflake','redshift']:
  folder=SQL/'04-production-design'/engine
  (folder/'example.expected.json').write_text(json.dumps({'status':'NOT EXECUTED ON '+engine,'reference_engine':'SQLite equivalent of the bounded monthly analytical intent; native syntax, date typing, access, costs and runtime are not validated','parameters':{'start_date':'2026-01-01','end_date':'2026-07-01'},'row_count':len(reference),'preview_rows':reference[:5]},indent=2)+'\n')
 for language in ['en','es']:
  es=language=='es';guide=['# '+('SQL: del problema al resultado' if es else 'SQL: from question to verified result'),'',('[English](VISUAL-GUIDE.md)' if es else '[Español](VISUAL-GUIDE.es.md)'),'',('Resultados de ejecuciones SQLite reales sobre datos sintéticos. La vista documental y sus capturas no son Power BI ni Tableau, ni un editor SQL en directo.' if es else 'Actual SQLite results on synthetic data. The documentary view and screenshots are not Power BI/Tableau or a live SQL editor.'),'', '[Vista documental HTML / Documentary HTML](../../09-docs/sql/query-demo.'+language+'.html)','', '```mermaid','flowchart LR',' A[Pregunta / Question] --> B[Fuente / Source]',' B --> C[SQL con parametros / Bound SQL]',' C --> D[Salida guardada / Saved output]',' D --> E[Comprobacion / Check]','```','',('## Consultas y funcionalidades' if es else '## Queries and functionality'),'']
  for panel in panels:guide.append(f"- [{panel[language]}](#{panel['id']})")
  for panel in panels:
   guide += ['',f"<a id=\"{panel['id']}\"></a>",f"## {panel[language]}",'',panel['logic_'+language],'',f"**{'Parámetros' if es else 'Parameters'}:** `{json.dumps(panel['parameters'],ensure_ascii=False)}`",'',f"[{'Código fuente' if es else 'Source code'}]({panel['file']}) · [{'Salida completa' if es else 'Full saved output'}]({panel['output']})",'', '<details>', '<summary>'+('Ver el SQL exacto' if es else 'Inspect the exact SQL')+'</summary>','', '```sql',panel['code'].rstrip(),'```','','</details>','',f"**{'Salida real' if es else 'Actual result'} · {panel['row_count']} {'filas; primeras 5' if es else 'rows; first 5'}**",'',mdtable(panel['rows']),'',('Los importes están en céntimos enteros; NULL no es cero. La salida JSON conserva todos los valores sin redondeo.' if es else 'Amounts are integer cents; NULL is not zero. The JSON output preserves all values without display rounding.')]
  guide += ['','## BI / Power BI / Tableau','',('[Datos y medidas conectados al mismo caso](../04-bi/README.md)' if es else '[Data and measures connected to the same case](../04-bi/README.md)'),'', '## BigQuery / Snowflake / Redshift','',('Cada plantilla tiene `example.expected.json`: salida de referencia SQLite, **no ejecución cloud**. [Límites y preparación](04-production-design/README.md).' if es else 'Each template has `example.expected.json`: a SQLite reference output, **not cloud execution**. [Limits and preparation](04-production-design/README.md).'),'']
  (SQL/('VISUAL-GUIDE.es.md' if es else 'VISUAL-GUIDE.md')).write_text('\n'.join(guide))
 page_template=Path(__file__).with_name('query_view.html').read_text()
 data=json.dumps(panels,ensure_ascii=False).replace('<','\\u003c')
 for language in ['es','en']:(ROOT/f'09-docs/sql/query-demo.{language}.html').write_text(page_template.replace('__LANG__',language).replace('__DATA__',data))
 (HERE/'guide-manifest.json').write_text(json.dumps({'generated_by':'05-validation/06-sql/build_guide.py','sqlite_version':sqlite3.sqlite_version,'panels':[{'id':p['id'],'source':p['file'],'query_sha256':p['query_sha256'],'row_count':p['row_count'],'output':p['output']} for p in panels],'cloud_outputs':'SQLite reference only, never native execution'},indent=2)+'\n');db.close()
 print('Generated bilingual query walkthroughs, 9 executed query outputs, schema/index outputs, 3 explicitly non-native cloud references and documentary HTML')
if __name__=='__main__':build()
