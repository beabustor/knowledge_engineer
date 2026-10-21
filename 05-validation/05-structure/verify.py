"""Check the documentation contract and explicit stage-map references after reorganization."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def main():
 errors=[]
 for directory in ROOT.iterdir():
  if not directory.is_dir() or not re.match(r'^\d{2}-',directory.name):continue
  for folder in [directory,*directory.rglob('*')]:
   if not folder.is_dir() or any(p in folder.parts for p in ('node_modules','dist','__pycache__','test-results')):continue
   if any(folder.iterdir()) and not (folder/'README.md').is_file():errors.append('Missing README: '+str(folder.relative_to(ROOT)))
 index=json.loads((ROOT/'03-pipelines/execution-map.json').read_text());ids={n['id'] for n in index['nodes']}
 for node in index['nodes']:
  if not (ROOT/node['source']).is_file():errors.append('Missing stage source: '+node['source'])
  for dependency in node['depends_on']:
   if dependency not in ids:errors.append('Unknown stage dependency: '+dependency)
 for file in [ROOT/'README.md',ROOT/'README.es.md',ROOT/'09-docs/EXECUTION.md',ROOT/'09-docs/NAMING.md']:
  for target in re.findall(r'\]\(([^)]+)\)',file.read_text()):
   if re.match(r'^(https?:|#)',target):continue
   if not (file.parent/target.split('#')[0]).exists():errors.append('Broken primary guide link: '+target)
 assert not errors,'\n'.join(errors)
 print('Folder READMEs, primary guide links and stage-map references verified')
if __name__=='__main__':main()
