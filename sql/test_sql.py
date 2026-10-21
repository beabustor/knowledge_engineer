import runpy
from pathlib import Path
import sqlite3
import unittest

sql_demo = runpy.run_path(str(Path(__file__).with_name('demo.py')))


class SQLTests(unittest.TestCase):
    def test_ranking_matches_python_and_repeated_import(self):
        data = sql_demo['load']()
        with sqlite3.connect(':memory:') as connection:
            sql_demo['populate'](connection, data)
            sql_demo['populate'](connection, data)
            self.assertEqual(connection.execute('SELECT count(*) FROM disease_symptom').fetchone()[0], 8)
            for text in ['fiebre y tos', 'cefalea y náuseas, pero sin fiebre', 'frío', 'sin tos, fiebre']:
                result = sql_demo['retrieve'](text, data)
                rows = sql_demo['rank'](connection, result['positive'], result['negative'])
                self.assertEqual([(r[0], r[2]) for r in rows],
                                 [(r['id'], r['score']) for r in result['candidates']])
            queries = Path(__file__).with_name('queries.sql').read_text().split(';')
            ambiguous = connection.execute(queries[0]).fetchall()
            self.assertEqual(ambiguous[0][0], 'frío')
            ancestors = connection.execute(queries[1]).fetchall()
            self.assertIn(('ExampleCold', 'Disease'), ancestors)
            self.assertEqual(connection.execute('PRAGMA foreign_key_check').fetchall(), [])


if __name__ == '__main__':
    unittest.main()
