"""Validate canonical graph and prove negative fixtures are rejected."""
import json
from pathlib import Path
import subprocess
import sys
from rdflib import Graph, Namespace, Literal
from rdflib.namespace import RDF, RDFS, OWL, XSD
from pyshacl import validate
from owlrl import DeductiveClosure, OWLRL_Semantics

ROOT = Path(__file__).resolve().parents[1]
EX = Namespace('https://example.org/knowledge-explorer/')


def canonical():
    script = """
import {readFileSync} from 'node:fs';
import {representations} from './explorer/model.ts';
import {reportedConcepts} from './explorer/observations.ts';
import {confirmationConcepts} from './interview/engine.ts';
const catalog=[...JSON.parse(readFileSync('data/catalog.json','utf8')).concepts,...reportedConcepts('Tengo 35 años y temperatura 38.5 grados Celsius'),...confirmationConcepts({Cough:{answer:'no',origin:'confirmation'}})];
console.log(JSON.stringify(catalog.map(c=>representations(c,catalog).rdf)));
"""
    data = json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=ROOT,text=True))
    graph = Graph()
    for ttl in data:
        graph.parse(data=ttl,format='turtle')
    return graph


def conforms(graph):
    return bool(validate(graph,shacl_graph=str(ROOT/'semantic/shapes.ttl'),inference='none')[0])


def main():
    graph=canonical()
    assert conforms(graph), 'Canonical graph violates SHACL profile'
    # Reject schema/type errors instead of only checking that valid data passes.
    missing=Graph()+graph
    missing.remove((EX.Cough,RDFS.label,None))
    assert not conforms(missing), 'Missing labels went undetected'
    numeric=Graph()+graph
    numeric.remove((EX.SamplePerson,EX.age,None))
    numeric.add((EX.SamplePerson,EX.age,Literal('thirty-five')))
    assert not conforms(numeric), 'Invalid numeric type went undetected'
    collision=Graph()+graph
    collision.add((EX.SamplePerson,RDF.type,OWL.Class))
    assert not conforms(collision), 'Project class/instance collision went undetected'
    unsafe=Graph()+graph
    unsafe.add((EX.Fever,EX.candidateMatch,EX.Cough))
    unsafe.add((EX.Fever,OWL.equivalentClass,EX.Cough))
    assert not conforms(unsafe), 'Unsafe candidate equivalence went undetected'
    inferred=Graph()+graph
    DeductiveClosure(OWLRL_Semantics).expand(inferred)
    assert (EX.SampleClinician,RDF.type,EX.Person) in inferred, 'Expected subclass inference missing'
    assert (EX.SamplePerson,RDF.type,EX.Clinician) not in inferred, 'Unexpected inverse subclass inference'
    report={'profile':'project SHACL v1; not OWL DL certification','canonical_conforms':True,
            'canonical_triples':len(graph),'negative_fixtures_rejected':4,
            'reasoning':'OWL RL subclass inference and non-inference verified',
            'clinical_validation':False}
    (ROOT/'semantic/report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__':
    main()
