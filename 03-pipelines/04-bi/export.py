"""Build one BI star from the exact engine decisions used by the guided demo."""
import csv,hashlib,json,sqlite3,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent

def main():
 script="""
 import {updated,mappings,records,stateOf} from './03-pipelines/01-impact/engine.ts';
 import {reviewMaterial} from './03-pipelines/01-impact/glove-case.ts';
 const decisions=reviewMaterial(reviewMaterial({},'nitrile','NitrileGlove'),'latex','LatexGlove');
 console.log(JSON.stringify({catalog:updated,mappings:mappings.map(m=>({...m,...stateOf(m,updated,decisions),original_target:m.target,reviewed:Boolean(decisions[m.id])})),records}));
 """
 payload=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=ROOT,text=True))
 def save(name,columns,rows):
  with (HERE/'data'/name).open('w',newline='') as f:w=csv.writer(f,lineterminator="\n");w.writerow(columns);w.writerows(rows)
 ms=payload['mappings'];rs=payload['records'];suppliers=sorted({m['supplier'] for m in ms});sid={s:f'S{i+1}' for i,s in enumerate(suppliers)}
 save('fact_purchase.csv',['purchase_id','mapping_id','month','department','quantity','amount_cents'],[(r['id'],r['mapping'],r['month'],r['department'],r['quantity'],r['amountCents']) for r in rs])
 save('dim_mapping.csv',['mapping_id','supplier_id','sku','original_target','category_id','material','status','reviewed'],[(m['id'],sid[m['supplier']],m['sku'],m['original_target'],m['target'] if m['status']=='valid' else 'unresolved',m['attributes'].get('material','unspecified'),m['status'],int(m['reviewed'])) for m in ms])
 save('dim_supplier.csv',['supplier_id','supplier'],[(sid[s],s) for s in suppliers])
 save('dim_month.csv',['month','month_start'],[(m,m+'-01') for m in sorted({r['month'] for r in rs})])
 save('dim_category.csv',['category_id','label_en','label_es'],[(c['id'],c['labels']['en'],c['labels']['es']) for c in payload['catalog']['concepts']]+[('unresolved','Unresolved','Sin resolver')])
 # Independently load the CSVs and run actual relational checks, not copied UI constants.
 db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
 for path in sorted((HERE/'data').glob('*.csv')):
  with path.open() as f:rows=list(csv.reader(f))
  columns=rows[0];db.execute(f'CREATE TABLE {path.stem} ({",".join(columns)})')
  db.executemany(f'INSERT INTO {path.stem} VALUES({",".join("?" for _ in columns)})',rows[1:])
 join=' FROM fact_purchase f JOIN dim_mapping m ON m.mapping_id=f.mapping_id JOIN dim_supplier s ON s.supplier_id=m.supplier_id JOIN dim_category c ON c.category_id=m.category_id JOIN dim_month d ON d.month=f.month '
 total=dict(db.execute('SELECT COUNT(*) AS purchase_lines,SUM(CAST(amount_cents AS INTEGER)) AS amount_cents'+join).fetchone())
 assert total=={'purchase_lines':8640,'amount_cents':sum(r['amountCents'] for r in rs)}
 for table,key in [('fact_purchase','purchase_id'),('dim_mapping','mapping_id'),('dim_supplier','supplier_id'),('dim_month','month'),('dim_category','category_id')]:assert db.execute(f'SELECT COUNT(*)=COUNT(DISTINCT {key}) FROM {table}').fetchone()[0]
 glove=dict(db.execute("SELECT COUNT(*) AS purchase_lines,SUM(CAST(amount_cents AS INTEGER)) AS amount_cents"+join+"WHERE m.original_target='ProtectiveGlove'").fetchone())
 materials=[dict(r) for r in db.execute("SELECT m.material,COUNT(*) AS purchase_lines"+join+"WHERE m.original_target='ProtectiveGlove' GROUP BY m.material ORDER BY m.material")]
 pending=db.execute("SELECT COUNT(*)"+join+"WHERE m.status='unresolved'").fetchone()[0]
 assert glove['purchase_lines']==180 and [r['purchase_lines'] for r in materials]==[90,90] and pending==720
 output={'execution':'Actual engine decisions -> CSV -> independently queried in SQLite','snapshot':'v2 with ONLY the six guided glove mappings reviewed; other changes stay unresolved','all_data':total,'glove_filter':"dim_mapping.original_target = 'ProtectiveGlove'",'glove_case':glove,'materials':materials,'other_unresolved_lines':pending,'native_bi_execution':False,'relationship_checks':'Unique dimension keys; inner joins preserve all 8640 rows and every cent'}
 (HERE/'output.json').write_text(json.dumps(output,indent=2)+'\n')
 for tool in ['power-bi','tableau']:(HERE/tool/'expected-output.json').write_text(json.dumps({'status':'Expected native-tool results; NOT executed in '+tool,'reference':'../output.json','glove_filter':output['glove_filter'],'purchase_lines':180,'nitrile_lines':90,'latex_lines':90,'amount_cents':glove['amount_cents'],'all_dataset_unresolved_lines':720,'measures':{'Purchase Lines':glove['purchase_lines'],'Amount EUR':glove['amount_cents']/100,'Glove Lines':glove['purchase_lines'],'Glove Pending Lines':0},'measure_scope':'original_target = ProtectiveGlove; same as guided demo'},indent=2)+'\n')
 manifest={'snapshot':output['snapshot'],'generated_by':'03-pipelines/04-bi/export.py','native_tools_validated':False,'csv_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((HERE/'data').glob('*.csv'))}}
 (HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 for lang in ['en','es']:
  es=lang=='es'
  title='Un informe BI conectado a las decisiones' if es else 'A BI report connected to the decisions'
  notice='Vista documental con valores reales de la exportación CSV. NO es una captura ni ejecución de Power BI o Tableau.' if es else 'Documentary view with actual CSV-export values. NOT a Power BI/Tableau screenshot or native execution.'
  cards=[('Líneas / Lines',glove['purchase_lines']),('Nitrilo / Nitrile',90),('Látex / Latex',90),('EUR sintéticos / Synthetic EUR',f"{glove['amount_cents']/100:.2f}")]
  body=''.join(f'<div class="card"><strong>{value}</strong><span>{label}</span></div>' for label,value in cards)
  page=f'<!doctype html><html lang="{lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BI · Saved reference</title><style>body{{font:17px/1.6 system-ui;color:#193f35;background:#f2f6f2;margin:0}}main{{max-width:1100px;margin:auto;padding:30px}}h1{{font-size:32px;line-height:1.2}}.note{{background:#fff0d3;border-left:4px solid #b68b32;padding:16px}}.cards{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}}.card{{background:white;border:1px solid #c6d9cb;border-radius:12px;padding:20px;display:flex;flex-direction:column}}strong{{font-size:30px}}section{{background:white;border:1px solid #d3dfd4;padding:22px;border-radius:12px;margin-top:20px}}.bar{{background:#dce8dd;height:24px;border-radius:6px;margin:8px 0 18px}}.fill{{background:#24785f;width:50%;height:100%}}code,pre{{font:15px/1.6 monospace;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}}@media(max-width:650px){{main{{padding:16px}}.cards{{grid-template-columns:1fr 1fr}}h1{{font-size:27px}}}}</style><main><h1>{title}</h1><p class="note">{notice}</p><p>Demo → seis decisiones / six decisions → CSV → Power BI / Tableau</p><code>Filter: original_target = ProtectiveGlove</code><div class="cards">{body}</div><section><h2>Compras por material / Purchases by material</h2><p>Nitrilo / Nitrile · 90</p><div class="bar"><div class="fill"></div></div><p>Látex / Latex · 90</p><div class="bar"><div class="fill"></div></div></section><section><h2>Código → tarjeta / Code → card</h2><pre>Power BI: Purchase Lines = COALESCE(COUNTROWS(FactPurchase), 0)\nTableau: Purchase Lines = COUNT([purchase_id])\nSQL reference: COUNT(*) = 180 (glove filter)</pre><p>Claves únicas / unique keys → relaciones uno-a-muchos / one-to-many → sin duplicar importes / no duplicated amounts.</p></section><p>Full export: 8,640 lines · 720 still unresolved outside the glove case. No hidden all-catalog approval. Native M/DAX/Tableau formulas remain to validate.</p></main></html>'
  (ROOT/f'09-docs/sql/bi-preview.{lang}.html').write_text(page)
 print(json.dumps(output,indent=2));db.close()
if __name__=='__main__':main()
