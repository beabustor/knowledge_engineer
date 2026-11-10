"""Ensure saved query results still match real SQL; no native BI/cloud execution claim."""
import importlib.util,json
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1];SQL=ROOT/'03-pipelines/03-sql'
def main():
 files=list(SQL.glob('**/*.output.json'));before={p:json.loads(p.read_text()) for p in files}
 spec=importlib.util.spec_from_file_location('guide_builder',HERE/'build_guide.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);mod.build()
 for p,old in before.items():
  new=json.loads(p.read_text())
  for key in ['rows','parameters','query_sha256','row_count']:
   if key in old:assert old[key]==new[key],f'Saved output drift: {p.name} / {key}'
 print('Saved query rows, parameters and SQL hashes match fresh execution; SQLite version metadata may differ by runtime')
if __name__=='__main__':main()
