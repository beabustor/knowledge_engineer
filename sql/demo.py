"""SQLite representation and ranked query using shared Python lexical extraction."""
import argparse
from pathlib import Path
import sqlite3
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'python'))
from demo import load, retrieve, locale, display


def populate(connection, data):
    connection.executescript(Path(__file__).with_name('schema.sql').read_text())
    labels = locale('en')['labels']
    concepts = [(cid, label, 'symptom' if cid in data['symptoms'] else
                 'disease' if cid in data['diseases'] else
                 'category' if cid in ('Disease', 'Symptom', 'RespiratoryDisease') else 'other')
                for cid, label in labels.items()]
    connection.executemany('INSERT OR IGNORE INTO concept VALUES (?, ?, ?)', concepts)
    connection.executemany('INSERT OR IGNORE INTO concept_label VALUES (?, ?, ?)',
                           [(cid, lang, label) for lang in ('en', 'es')
                            for cid, label in locale(lang)['labels'].items()])
    edges = [('RespiratoryDisease', 'Disease')]
    edges += [(s, 'Symptom') for s in data['symptoms']]
    edges += [(k, v['parent']) for k, v in data['diseases'].items()]
    connection.executemany('INSERT OR IGNORE INTO is_a VALUES (?, ?)', edges)
    terms = [(term, k) for k, terms in data['symptoms'].items() for term in terms]
    terms += [(term, s) for term, senses in data['ambiguous'].items() for s in senses]
    connection.executemany('INSERT OR IGNORE INTO term_sense VALUES (?, ?, ?)',
                           [(term, data['term_languages'][term], cid) for term, cid in terms])
    connection.executemany('INSERT OR IGNORE INTO disease_symptom VALUES (?, ?)',
                           [(k, s) for k, v in data['diseases'].items() for s in v['symptoms']])


def rank(connection, positive, negative, lang='es'):
    locale(lang)  # Validate before executing the query.
    connection.execute('CREATE TEMP TABLE IF NOT EXISTS observed (id TEXT PRIMARY KEY, positive INTEGER, negative INTEGER)')
    connection.execute('DELETE FROM observed')
    connection.executemany('INSERT INTO observed VALUES (?, ?, ?)',
                           [(s, int(s in positive), int(s in negative)) for s in set(positive) | set(negative)])
    return connection.execute(Path(__file__).with_name('rank.sql').read_text(), {'lang': lang}).fetchall()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('description', nargs='?', help='Description in English or Spanish / Descripción en inglés o español')
    parser.add_argument('--lang', choices=('en', 'es'), default='es', help='Output language / Idioma de salida')
    parser.add_argument('--json', action='store_true', help='JSON output / Salida JSON')
    args = parser.parse_args()
    data = load()
    with sqlite3.connect(':memory:') as connection:
        populate(connection, data)
        result = retrieve(args.description or locale(args.lang)['default_description'], data, args.lang)
        rows = rank(connection, result['positive'], result['negative'], args.lang)
        # SQL is authoritative for ordering and score; Python supplies lexical explanations.
        by_id = {c['id']: c for c in result['candidates']}
        result['candidates'] = [dict(by_id[cid], label=label, score=score) for cid, label, score in rows]
        if args.json:
            import json
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            display(result, args.lang)


if __name__ == '__main__':
    main()
