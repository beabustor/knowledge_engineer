"""SQLite representation and ranked query using shared Python lexical extraction."""
import argparse
from pathlib import Path
import sqlite3
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'python'))
from demo import load, retrieve


def populate(connection, data):
    connection.executescript(Path(__file__).with_name('schema.sql').read_text())
    concepts = [('Disease', 'Enfermedad', 'category'), ('Symptom', 'Síntoma', 'category'),
                ('RespiratoryDisease', 'Enfermedad respiratoria', 'category')]
    concepts += [(k, v[0], 'symptom') for k, v in data['symptoms'].items()]
    concepts += [(k, v['label'], 'disease') for k, v in data['diseases'].items()]
    concepts += [(s, s, 'other') for senses in data['ambiguous'].values() for s in senses]
    connection.executemany('INSERT OR IGNORE INTO concept VALUES (?, ?, ?)', concepts)
    edges = [('RespiratoryDisease', 'Disease')]
    edges += [(s, 'Symptom') for s in data['symptoms']]
    edges += [(k, v['parent']) for k, v in data['diseases'].items()]
    connection.executemany('INSERT OR IGNORE INTO is_a VALUES (?, ?)', edges)
    terms = [(term, k) for k, terms in data['symptoms'].items() for term in terms]
    terms += [(term, s) for term, senses in data['ambiguous'].items() for s in senses]
    connection.executemany('INSERT OR IGNORE INTO term_sense VALUES (?, ?)', terms)
    connection.executemany('INSERT OR IGNORE INTO disease_symptom VALUES (?, ?)',
                           [(k, s) for k, v in data['diseases'].items() for s in v['symptoms']])


def rank(connection, positive, negative):
    connection.execute('CREATE TEMP TABLE IF NOT EXISTS observed (id TEXT PRIMARY KEY, positive INTEGER, negative INTEGER)')
    connection.execute('DELETE FROM observed')
    connection.executemany('INSERT INTO observed VALUES (?, ?, ?)',
                           [(s, int(s in positive), int(s in negative)) for s in set(positive) | set(negative)])
    return connection.execute(Path(__file__).with_name('rank.sql').read_text()).fetchall()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('description', nargs='?', default='Tengo cefalea y náuseas, pero sin fiebre')
    args = parser.parse_args()
    data = load()
    with sqlite3.connect(':memory:') as connection:
        populate(connection, data)
        result = retrieve(args.description, data)
        print('EJEMPLO SINTÉTICO: SQL ranking (no diagnóstico)')
        print(rank(connection, result['positive'], result['negative']))


if __name__ == '__main__':
    main()
