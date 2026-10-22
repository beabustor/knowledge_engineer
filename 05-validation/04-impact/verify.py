"""Full-fixture SHACL, source checksums, OWL RL and RDF/XML round-trip evidence."""
import hashlib,json,subprocess,time
from pathlib import Path
from rdflib import Graph,Namespace,Literal
from rdflib.namespace import RDF,OWL
from rdflib.compare import isomorphic
from pyshacl import validate
from owlrl import DeductiveClosure,OWLRL_Semantics
ROOT=Path(__file__).resolve().parents[2]
EX=Namespace('https://example.org/semantic-change/')
SKOS=Namespace('http://www.w3.org/2004/02/skos/core#')

def main():
 start=time.perf_counter()
 for entry in json.loads((ROOT/'02-model/01-standards/provenance.json').read_text()):
  assert hashlib.sha256((ROOT/entry['path']).read_bytes()).hexdigest()==entry['sha256']
 manifest=json.loads((ROOT/'01-data/02-impact-scenario/manifest.json').read_text())
 for name,checksum in manifest['sha256'].items():assert hashlib.sha256((ROOT/'01-data/02-impact-scenario'/name).read_bytes()).hexdigest()==checksum
 script="""
 import {baseline,updated,scenarioDecisions,analyze} from './03-pipelines/01-impact/engine.ts';
 import {graph,serialize} from './03-pipelines/01-impact/representations.ts';
 console.log(JSON.stringify([['v1',baseline,{}],['v2',updated,{}],['reviewed',updated,scenarioDecisions()]].map(([name,c,d])=>({name,...serialize(graph(c,d,undefined,true)),summary:{pending:analyze(c,d).unresolvedMappings,quarantined:analyze(c,d).quarantinedRecords,totalCents:analyze(c,d).totalCents}}))));
 """
 result=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=ROOT,text=True))
 reports=[]
 for row in result:
  g=Graph().parse(data=row['rdf'],format='turtle');xml=Graph().parse(data=row['owl'],format='xml');assert isomorphic(g,xml)
  passed,report,_=validate(g,shacl_graph=str(Path(__file__).with_name('shapes.ttl')),inference='none')
  assert passed==(row['name']!='v2'),row['name']
  reports.append({'state':row['name'],'triples':len(g),'shacl_conforms':bool(passed),**row['summary']})
 # Independently validate the exact 6-mapping / 180-line story exposed by the UI.
 guided_script="""
 import {baseline,updated,caseMappings,caseSummary,reviewMaterial} from './03-pipelines/01-impact/glove-case.ts';
 import {graph,serialize} from './03-pipelines/01-impact/representations.ts';
 const decisions=reviewMaterial(reviewMaterial({},'nitrile','NitrileGlove'),'latex','LatexGlove');
 console.log(JSON.stringify([['before',baseline,{}],['broken',updated,{}],['resolved',updated,decisions]].map(([name,c,d])=>({name,...serialize(graph(c,d,caseMappings.map(m=>m.id),true)),summary:caseSummary(c,d)}))));
 """
 guided=json.loads(subprocess.check_output(['node','--input-type=module','-e',guided_script],cwd=ROOT,text=True))
 guided_reports=[]
 for row in guided:
  g=Graph().parse(data=row['rdf'],format='turtle')
  assert isomorphic(g,Graph().parse(data=row['owl'],format='xml'))
  passed=bool(validate(g,shacl_graph=str(Path(__file__).with_name('shapes.ttl')))[0])
  assert passed==(row['name']!='broken')
  assert row['summary']['total']==180
  guided_reports.append({'state':row['name'],'shacl_conforms':passed,'purchase_lines':180,'pending_lines':row['summary']['pending'],'totalCents':row['summary']['totalCents']})
 assert len({r['totalCents'] for r in guided_reports})==1
 # Test semantic inference on the actual official SKOS vocabulary and the current catalog.
 small=Graph().parse(ROOT/'02-model/01-standards/skos.rdf',format='xml')
 small.parse(data=result[2]['rdf'],format='turtle')
 # Keep the reasoning demonstration bounded: taxonomy only, not 8,640 operational records.
 for s in list(small.subjects(RDF.type,Namespace('https://schema.org/').OrderItem)):
  small.remove((s,None,None))
 DeductiveClosure(OWLRL_Semantics).expand(small)
 assert (EX['term/NitrileGlove'],SKOS.broaderTransitive,EX['term/Supplies']) in small
 assert (EX['term/NitrileGlove'],SKOS.broaderTransitive,EX['term/Solvents']) not in small
 # A separately injected cycle must be rejected.
 cycle=Graph().parse(data=result[0]['rdf'],format='turtle');cycle.add((EX['term/Supplies'],SKOS.broader,EX['term/Glassware']))
 assert not validate(cycle,shacl_graph=str(Path(__file__).with_name('shapes.ttl')))[0]
 assert len({r['totalCents'] for r in reports})==1
 output={'scope':'Full 57/60-concept fixture, 288 mappings, 8640 purchase lines per state','synthetic':True,'states':reports,'guided_case':{'scope':'6 glove mappings / 180 purchase lines; other fixture changes are not resolved by the UI','states':guided_reports},'official_skos_transitive_inference':True,'negative_non_inference':True,'cycle_fixture_rejected':True,'rdf_xml_isomorphic':True,'elapsed_seconds':round(time.perf_counter()-start,2),'savings_claim':'No measured customer time saving; prioritization and accounting invariants only'}
 Path(__file__).with_name('report.json').write_text(json.dumps(output,indent=2)+'\n');print(json.dumps(output,indent=2))
if __name__=='__main__':main()
