"""Opt-in real source verification; no fixture fallback and no personal input."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import time
from urllib.request import urlopen, Request

SOURCES = {
    'ols': 'https://www.ebi.ac.uk/ols4/api/search?q=cough&ontology=hp&rows=5',
    'chebi': 'https://www.ebi.ac.uk/ols4/api/search?q=water&ontology=chebi&rows=5',
    'hpo': 'https://www.ebi.ac.uk/ols4/api/search?q=cough&ontology=hp&rows=5',
    'wikidata': 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=agua&language=es&uselang=es&format=json&origin=*&limit=5',
    'icd10': 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=R50.9&maxList=5',
    'cima': 'https://cima.aemps.es/cima/rest/medicamentos?nombre=paracetamol',
}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',choices=['all',*SOURCES],default='all')
    parser.add_argument('--output',default='tests/integration/live-report.json')
    args=parser.parse_args()
    results=[]
    for source,url in SOURCES.items():
        if args.source not in ('all',source):continue
        start=time.perf_counter()
        try:
            with urlopen(Request(url,headers={'Accept':'application/json','User-Agent':'KnowledgeEngineerPortfolio/1.0'}),timeout=20) as response:
                status=response.status;cors=response.headers.get('Access-Control-Allow-Origin');payload=response.read(2_000_001)
            if len(payload)>2_000_000:raise ValueError('Oversized response')
            data=json.loads(payload)
            if source in ('ols','hpo','chebi'):
                rows=data.get('response',{}).get('docs',[])
                target='water' if source=='chebi' else 'cough'
                found=[r for r in rows if str(r.get('label','')).lower()==target and r.get('iri')]
                assert found,'Expected ontology concept not returned'
                identifier=found[0].get('obo_id') or found[0].get('short_form') or found[0]['iri']
            elif source=='wikidata':
                found=[r for r in data.get('search',[]) if r.get('id')=='Q283' and r.get('label')=='agua']
                assert found,'Expected Wikidata water entity not returned'
                identifier=found[0]['id']
            elif source=='icd10':
                found=[r for r in data[3] if r[0]=='R50.9' and 'fever' in r[1].lower()]
                assert found,'Expected ICD-10-CM fever code not returned'
                identifier=found[0][0]
            else:
                found=[r for r in data.get('resultados',[]) if 'paracetamol' in str(r.get('nombre','')).lower() and r.get('nregistro')]
                assert found,'Expected medicine and registration identifier not returned'
                identifier=str(found[0]['nregistro'])
            results.append({'source':source,'status':'passed','http_status':status,'cors_allow_origin':cors,'identifier':identifier,'latency_ms':round((time.perf_counter()-start)*1000,1)})
        except Exception as error:
            results.append({'source':source,'status':'blocked_or_failed','error_type':type(error).__name__,'error':str(error)[:300]})
    report={'observed_at_utc':datetime.now(timezone.utc).isoformat(),'execution':'live HTTP; no mocked fallback','results':results,
            'at_least_one_passed':any(r['status']=='passed' for r in results),'all_passed':all(r['status']=='passed' for r in results)}
    path=Path(args.output);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    if not report['all_passed']:raise SystemExit(1)


if __name__=='__main__':main()
