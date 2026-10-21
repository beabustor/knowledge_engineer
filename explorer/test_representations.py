"""Validate that on-screen Turtle, OWL and SQL preserve exactly the same graph."""
import json
from pathlib import Path
import sqlite3
import subprocess
import unittest
from rdflib import Graph, Literal
from rdflib.compare import isomorphic


class RepresentationTests(unittest.TestCase):
    def test_every_concept_has_equivalent_representations(self):
        root = Path(__file__).resolve().parents[1]
        script = """
import {readFileSync} from 'node:fs';
import {representations} from './explorer/model.ts';
import {reportedConcepts} from './explorer/observations.ts';
const catalog=[...JSON.parse(readFileSync('data/catalog.json','utf8')).concepts,...reportedConcepts('Tengo 35 años y temperatura 38,5 grados Celsius')];
console.log(JSON.stringify(catalog.map(c=>({id:c.id,...representations(c,catalog)}))));
"""
        results = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', script], cwd=root, text=True))
        for result in results:
            with self.subTest(concept=result['id']):
                turtle = Graph().parse(data=result['rdf'], format='turtle')
                owl = Graph().parse(data=result['owl'], format='xml')
                self.assertTrue(isomorphic(turtle, owl))
                with sqlite3.connect(':memory:') as connection:
                    connection.executescript(result['sql'])
                    connection.executescript(result['sql'])
                    rows = set(connection.execute('SELECT * FROM explorer_triple'))
                triples = {(str(s), str(p), str(o), int(isinstance(o, Literal)),
                            (o.language or '') if isinstance(o, Literal) else '',
                            str(o.datatype or '') if isinstance(o, Literal) else '') for s, p, o in turtle}
                self.assertEqual(rows, triples)
