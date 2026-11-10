"""Execute the SQL proficiency evidence locally; no cloud client, credential or persistent DB."""
import hashlib,json,sqlite3
from collections import defaultdict
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SQL=ROOT/'03-pipelines/03-sql'
DATA=ROOT/'01-data/02-impact-scenario'

def load():
 db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
 db.executescript((SQL/'schema.sql').read_text())
 mappings=json.loads((DATA/'mappings.json').read_text())
 packed=json.loads((DATA/'records.json').read_text());records=[dict(zip(packed['columns'],row)) for row in packed['rows']]
 suppliers=sorted({m['supplier'] for m in mappings});supplier_ids={s:f'S{i+1}' for i,s in enumerate(suppliers)}
 db.executemany('INSERT INTO supplier VALUES(?,?)',[(supplier_ids[s],s) for s in suppliers])
 db.executemany('INSERT INTO dim_month VALUES(?)',[(m,) for m in sorted({r['month'] for r in records})])
 for version in ('v1','v2'):
  cat=json.loads((DATA/f'catalog-{version}.json').read_text());release=cat['version']
  db.executemany('INSERT INTO concept VALUES(?,?,?,?,?)',[(release,c['id'],c['labels']['en'],c['labels']['es'],int(c.get('deprecated',False))) for c in cat['concepts']])
  db.executemany('INSERT INTO broader VALUES(?,?,?)',[(release,c['id'],p) for c in cat['concepts'] for p in c['broader']])
 db.executemany('INSERT INTO product_mapping VALUES(?,?,?,?,?)',[(m['id'],supplier_ids[m['supplier']],m['sku'],m['target'],m['attributes'].get('material')) for m in mappings])
 db.executemany('INSERT INTO purchase VALUES(?,?,?,?,?,?)',[(r['id'],r['mapping'],r['department'],r['month'],r['quantity'],r['amountCents']) for r in records]);db.commit()
 return db,mappings,records,supplier_ids

def query(db,file,params=None):return [dict(r) for r in db.execute((SQL/file).read_text(),params or {})]

def main():
 manifest=json.loads((DATA/'manifest.json').read_text())
 for name,checksum in manifest['sha256'].items():assert hashlib.sha256((DATA/name).read_bytes()).hexdigest()==checksum
 db,mappings,records,suppliers=load();passed=[]
 def mark(name):passed.append(name)
 total=sum(r['amountCents'] for r in records);by_mapping={m['id']:m for m in mappings}
 params={'department':'Research','mapping_id':'M0001','row_limit':100}
 basic=query(db,'01-basic/01-filter.sql',params)
 assert len(basic)==sum(r['department']=='Research' and r['mapping']=='M0001' for r in records);mark('basic: bound parameters and filtering')
 spend=query(db,'02-intermediate/01-supplier-spend.sql',{'minimum_cents':0})
 expected=defaultdict(int)
 for r in records:expected[suppliers[by_mapping[r['mapping']]['supplier']]]+=r['amountCents']
 assert {r['supplier_id']:r['amount_cents'] for r in spend}==dict(expected)
 assert sum(r['purchase_lines'] for r in spend)==8640;mark('joins: exact supplier totals and fact grain')
 queue=query(db,'02-intermediate/02-review-queue.sql',{'release':'scenario-v2'})
 assert len(queue)==30 and sum(r['affected_lines'] for r in queue)==900;mark('subquery: NOT EXISTS finds 30 inactive mappings / 900 lines')
 ranked=query(db,'03-advanced/02-prioritize-impact.sql',{'release':'scenario-v2'})
 assert {r['id'] for r in ranked}=={r['id'] for r in queue};assert abs(sum(r['exposure_share'] for r in ranked)-1)<1e-12
 assert ranked[0]['global_priority']==1;mark('windows: financial exposure ranking reconciles to queue')
 monthly=query(db,'03-advanced/01-monthly-windows.sql');sums=defaultdict(int);last={}
 expected_monthly=defaultdict(int)
 for r in records:expected_monthly[(suppliers[by_mapping[r['mapping']]['supplier']],r['month'])]+=r['amountCents']
 for row in monthly:
  key=row['supplier_id'];assert row['amount_cents']==expected_monthly[(key,row['month'])];assert row['previous_cents']==last.get(key)
  sums[key]+=row['amount_cents'];assert row['running_cents']==sums[key];last[key]=row['amount_cents']
 assert dict(sums)==dict(expected) and len(monthly)==18;mark('windows: LAG and explicit running frame match independent totals')
 db.execute('SAVEPOINT zero_month');db.execute("DELETE FROM purchase WHERE mapping_id IN (SELECT id FROM product_mapping WHERE supplier_id='S1') AND month='2026-02'")
 zero=query(db,'03-advanced/01-monthly-windows.sql');feb=next(r for r in zero if r['supplier_id']=='S1' and r['month']=='2026-02');mar=next(r for r in zero if r['supplier_id']=='S1' and r['month']=='2026-03')
 assert feb['amount_cents']==0 and mar['previous_cents']==0 and mar['growth_pct'] is None
 db.execute('ROLLBACK TO zero_month');db.execute('RELEASE zero_month');mark('edge: missing month becomes zero; zero denominator stays NULL')
 root=query(db,'03-advanced/03-taxonomy-spend.sql',{'release':'scenario-v1','category':'Supplies'})[0]
 assert root['purchase_lines']==8640 and root['amount_cents']==total
 db.execute("INSERT INTO broader VALUES('scenario-v1','ProtectiveGlove','Supplies')")
 assert query(db,'03-advanced/03-taxonomy-spend.sql',{'release':'scenario-v1','category':'Supplies'})[0]==root;mark('recursive CTE: multiple hierarchy paths do not duplicate facts')
 db.executescript('CREATE TABLE mapping_event(event_id INTEGER PRIMARY KEY,mapping_id TEXT,target TEXT,event_time TEXT);')
 db.executemany('INSERT INTO mapping_event VALUES(?,?,?,?)',[(1,'M0001','Old','2026-01-01'),(2,'M0001','First','2026-02-01'),(3,'M0001','Latest','2026-02-01')])
 assert query(db,'03-advanced/04-deduplicate-events.sql')==[{'mapping_id':'M0001','target':'Latest','event_id':3}];mark('deduplication: timestamp ties resolve by stable event id')
 db.execute('SAVEPOINT equal_amounts');db.execute('UPDATE purchase SET amount_cents=1')
 ties=query(db,'03-advanced/02-prioritize-impact.sql',{'release':'scenario-v2'})
 assert all(r['global_priority']==1 for r in ties)
 for supplier in suppliers.values():assert sorted(r['supplier_priority'] for r in ties if r['supplier_id']==supplier)==list(range(1,11))
 db.execute('ROLLBACK TO equal_amounts');db.execute('RELEASE equal_amounts');mark('edge: tied exposure has shared dense rank and deterministic row numbers')
 # Reproduce an incorrect supplier-grain join; prove its inflation and verify the correction.
 bad=db.execute('SELECT SUM(p.amount_cents) FROM purchase p JOIN product_mapping m ON m.id=p.mapping_id JOIN product_mapping other ON other.supplier_id=m.supplier_id').fetchone()[0]
 assert bad==total*96 and sum(r['amount_cents'] for r in spend)==total;mark('troubleshooting: diagnose 96x join fan-out and reconcile corrected totals')
 probe='SELECT SUM(amount_cents) FROM purchase WHERE mapping_id=? AND month=?'
 before=[r[3] for r in db.execute('EXPLAIN QUERY PLAN '+probe,('M0001','2026-01'))];value=db.execute(probe,('M0001','2026-01')).fetchone()[0]
 db.executescript((SQL/'indexes.sql').read_text())
 after=[r[3] for r in db.execute('EXPLAIN QUERY PLAN '+probe,('M0001','2026-01'))]
 assert db.execute(probe,('M0001','2026-01')).fetchone()[0]==value
 assert any('idx_purchase_mapping_month' in p for p in after);mark('plan: composite-index search preserves result; no scale/time claim')
 statements=[s for s in (SQL/'03-advanced/05-review-transaction.sql').read_text().split(';') if s.strip()]
 args={'mapping_id':'M0001','release':'scenario-v2','target':'Water','actor':'test-reviewer','reason':'Fixture review'}
 for statement in statements:db.execute(statement,args)
 assert db.execute('SELECT COUNT(*) FROM review_decision').fetchone()[0]==1
 db.execute('SAVEPOINT failed_batch')
 try:
  db.execute("INSERT INTO review_decision VALUES('M0002','scenario-v2','Water','test','valid')")
  db.execute("INSERT INTO review_decision VALUES('M0003','scenario-v2','Invented','test','invalid target')")
  raise AssertionError('FK accepted an invented target')
 except sqlite3.IntegrityError:db.execute('ROLLBACK TO failed_batch')
 finally:db.execute('RELEASE failed_batch')
 assert db.execute('SELECT COUNT(*) FROM review_decision').fetchone()[0]==1;mark('transaction: executed upsert and failed multi-row batch rolls back atomically')
 try:db.execute("INSERT INTO purchase VALUES('BAD','M0001','Research','2026-01',1,-1)");raise AssertionError('Negative amount accepted')
 except sqlite3.IntegrityError:pass
 mark('quality: foreign keys and monetary constraints reject invalid data')
 try:db.execute("INSERT INTO review_decision VALUES('M0004','scenario-v2','Acetone','test','retired target')");raise AssertionError('Retired target accepted')
 except sqlite3.IntegrityError:pass
 mark('quality: review trigger rejects a retired target even when its identifier exists')
 report={'engine':'SQLite','sqlite_version':sqlite3.sqlite_version,'scope':manifest['counts'],'passed_checks':passed,'check_count':len(passed),'total_amount_cents':total,'query_plan':{'before':before,'after':after},'sql_sha256':{str(p.relative_to(SQL)):hashlib.sha256(p.read_bytes()).hexdigest() for p in SQL.rglob('*.sql')},'cloud_execution':False,'cloud_templates':'Design examples only; not syntax/runtime verified on cloud warehouses','proficiency_claim':'Executable evidence of basic/intermediate/advanced SQL techniques; not a certification of personal proficiency or production expertise'}
 Path(__file__).with_name('report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));db.close()
if __name__=='__main__':main()
