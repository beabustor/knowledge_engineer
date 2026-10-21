"""Opt-in real source verification; no fixture fallback and no personal input."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import time
from urllib.request import urlopen, Request

SOURCES = {
    'ols': 'https://www.ebi.ac.uk/ols4/api/search?q=cough&ontology=hp&rows=5',
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
                status=response.status;payload=response.read(2_000_001)
            if len(payload)>2_000_000:raise ValueError('Oversized response')
            data=json.loads(payload)
            rows=data.get('response',{}).get('docs',[]) if source=='ols' else data.get('resultados',[])
            if not rows:raise AssertionError('No real source results')
            # Verify behavior, not just HTTP 200: source identifier + expected test term.
            if source=='ols':
                found=[r for r in rows if 'cough' in str(r.get('label','')).lower() and r.get('iri')]
                assert found,'Expected HPO cough term not returned'
                identifier=found[0].get('short_form') or found[0]['iri']
            else:
                found=[r for r in rows if 'paracetamol' in str(r.get('nombre','')).lower() and r.get('nregistro')]
                assert found,'Expected medicine and registration identifier not returned'
                identifier=str(found[0]['nregistro'])
            results.append({'source':source,'status':'passed','http_status':status,'identifier':identifier,'latency_ms':round((time.perf_counter()-start)*1000,1)})
        except Exception as error:
            results.append({'source':source,'status':'blocked_or_failed','error_type':type(error).__name__,'error':str(error)[:300]})
    report={'observed_at_utc':datetime.now(timezone.utc).isoformat(),'execution':'live HTTP; no mocked fallback','results':results,
            'at_least_one_passed':any(r['status']=='passed' for r in results)}
    path=Path(args.output);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    if not report['at_least_one_passed']:raise SystemExit(1)


if __name__=='__main__':main()
