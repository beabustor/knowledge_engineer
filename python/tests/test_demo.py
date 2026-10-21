import tempfile
import unittest
from pathlib import Path
from demo import export, load, retrieve


class DemoTests(unittest.TestCase):
    def test_respiratory(self):
        result = retrieve('Tengo fiebre, tos y dolor de garganta', load())
        self.assertEqual(result['candidates'][0]['id'], 'ExampleCold')
        self.assertEqual(result['candidates'][0]['score'], 3)

    def test_synonym_and_negation(self):
        result = retrieve('CEFALEA y nauseas, pero sin fiebre', load())
        self.assertEqual(result['positive'], ['headache', 'nausea'])
        self.assertEqual(result['negative'], ['fever'])
        self.assertEqual(result['candidates'][0]['id'], 'ExampleMigraine')
        self.assertEqual(next(c for c in result['candidates'] if c['id'] == 'ExampleFlu')['conflicts'], ['fever'])

    def test_negation_scope(self):
        result = retrieve('sin fiebre ni tos, tengo dolor de cabeza', load())
        self.assertEqual(result['negative'], ['cough', 'fever'])
        self.assertEqual(result['positive'], ['headache'])

    def test_ambiguity_and_boundaries(self):
        result = retrieve('frío y costoso', load())
        self.assertEqual(len(result['ambiguous']['frío']), 2)
        self.assertEqual(result['positive'], [])
        self.assertEqual(result['candidates'], [])

    def test_exports(self):
        with tempfile.TemporaryDirectory() as directory:
            export(load(), Path(directory))
            ttl = (Path(directory) / 'knowledge.ttl').read_text()
            cypher = (Path(directory) / 'knowledge.cypher').read_text()
            self.assertEqual(ttl.count('owl:someValuesFrom'), 8)
            self.assertEqual(cypher.count('[:HAS_SYMPTOM]'), 8)
            export(load(), Path(directory))
            self.assertEqual(ttl, (Path(directory) / 'knowledge.ttl').read_text())


if __name__ == '__main__':
    unittest.main()
