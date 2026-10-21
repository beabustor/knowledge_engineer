"""Synthetic knowledge retrieval demonstration, not a diagnostic system."""
import argparse
import json
from pathlib import Path
import re
import unicodedata


def normalize(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text.lower())
                   if unicodedata.category(c) != 'Mn')


def load():
    return json.loads((Path(__file__).resolve().parent.parent / 'data/knowledge.json').read_text())


def locale(lang='es'):
    if lang not in ('en', 'es'):
        raise ValueError('Supported languages / Idiomas admitidos: en, es')
    return json.loads((Path(__file__).resolve().parent.parent / f'locales/{lang}.json').read_text(encoding='utf-8'))


def retrieve(text, data, lang='es'):
    labels = locale(lang)['labels']
    text = normalize(text)
    positive, negative = set(), set()
    for concept, terms in data['symptoms'].items():
        for term in terms:
            for match in re.finditer(r'(?<!\w)' + re.escape(normalize(term)) + r'(?!\w)', text):
                prefix = re.split(r'[.,;:!?\n]|\b(?:pero|aunque|but|however)\b', text[:match.start()])[-1]
                target = negative if re.search(r'\b(?:sin|no|niego|not|without|deny|denies)\b', prefix) else positive
                target.add(concept)
    ambiguous = {term: senses for term, senses in data['ambiguous'].items()
                 if re.search(r'(?<!\w)' + re.escape(normalize(term)) + r'(?!\w)', text)}
    candidates = []
    for concept, disease in data['diseases'].items():
        symptoms = set(disease['symptoms'])
        matched, conflicts = symptoms & positive, symptoms & negative
        if matched:
            candidates.append(dict(id=concept, label=labels[concept],
                                   score=len(matched) - 2 * len(conflicts),
                                   matched=sorted(matched), conflicts=sorted(conflicts),
                                   unmentioned=sorted(symptoms - positive - negative)))
    candidates.sort(key=lambda c: (-c['score'], c['id']))
    return dict(positive=sorted(positive), negative=sorted(negative),
                ambiguous=ambiguous, candidates=candidates)


def export(data, directory):
    directory.mkdir(parents=True, exist_ok=True)
    quote = lambda s: json.dumps(s, ensure_ascii=False)
    ttl = ['@prefix ex: <https://example.org/knowledge-demo/> .',
           '@prefix owl: <http://www.w3.org/2002/07/owl#> .',
           '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
           'ex:Ontology a owl:Ontology ; rdfs:comment "Synthetic educational data"@en, "Datos educativos sintéticos"@es .',
           'ex:hasSymptom a owl:ObjectProperty .',
           'ex:denotes a owl:AnnotationProperty .']
    cypher = []
    translations = {lang: locale(lang)['labels'] for lang in ('en', 'es')}
    for cid in translations['en']:
        labels = {lang: translations[lang][cid] for lang in translations}
        ttl.append(f'ex:{cid} a owl:Class ; rdfs:label {quote(labels["en"])}@en, {quote(labels["es"])}@es .')
        cypher.append(f'MERGE (c:KnowledgeDemo:Concept {{id: {quote(cid)}}}) SET c.label = {quote(labels["en"])}, c.label_en = {quote(labels["en"])}, c.label_es = {quote(labels["es"])};')
    edges = [('RespiratoryDisease', 'IS_A', 'Disease')]
    edges += [(s, 'IS_A', 'Symptom') for s in data['symptoms']]
    for cid, disease in data['diseases'].items():
        edges.append((cid, 'IS_A', disease['parent']))
        edges.extend((cid, 'HAS_SYMPTOM', s) for s in disease['symptoms'])
    for a, rel, b in edges:
        if rel == 'IS_A':
            ttl.append(f'ex:{a} rdfs:subClassOf ex:{b} .')
        else:
            ttl.append(f'ex:{a} rdfs:subClassOf [ a owl:Restriction ; owl:onProperty ex:hasSymptom ; owl:someValuesFrom ex:{b} ] .')
        cypher.append(f'MATCH (a:KnowledgeDemo:Concept {{id: {quote(a)}}}), (b:KnowledgeDemo:Concept {{id: {quote(b)}}}) MERGE (a)-[:{rel}]->(b);')
    terms = {}
    for cid, synonyms in data['symptoms'].items():
        for term in synonyms:
            terms.setdefault(term, []).append(cid)
    terms.update(data['ambiguous'])
    for i, (term, senses) in enumerate(sorted(terms.items())):
        language = data['term_languages'][term]
        ttl.append(f'ex:term{i} rdfs:label {quote(term)}@{language} .')
        for cid in senses:
            ttl.append(f'ex:term{i} ex:denotes ex:{cid} .')
            cypher.append(f'MERGE (t:KnowledgeDemo:Term {{label: {quote(term)}, language: {quote(language)}}}) WITH t MATCH (c:KnowledgeDemo:Concept {{id: {quote(cid)}}}) MERGE (t)-[:DENOTES]->(c);')
    (directory / 'knowledge.ttl').write_text('\n'.join(ttl) + '\n', encoding='utf-8')
    (directory / 'knowledge.cypher').write_text('\n'.join(cypher) + '\n', encoding='utf-8')


def display(result, lang='es'):
    """Human text is localized; JSON keys and concept identifiers stay stable."""
    messages = locale(lang)
    print(messages['notice'])
    if not result['candidates']:
        print(messages['none'])
    for candidate in result['candidates']:
        print(f"{messages['candidate']}: {candidate['label']} ({messages['score']}: {candidate['score']})")
        for field in ('matched', 'conflicts', 'unmentioned'):
            labels = [messages['labels'][cid] for cid in candidate[field]]
            print(f"  {messages[field]}: {', '.join(labels) or '—'}")
    if result['ambiguous']:
        senses = {term: [messages['labels'][cid] for cid in ids]
                  for term, ids in result['ambiguous'].items()}
        print(f"{messages['ambiguous']}: {json.dumps(senses, ensure_ascii=False)}")


def main():
    parser = argparse.ArgumentParser(description='Knowledge retrieval / Recuperación de conocimiento')
    parser.add_argument('description', nargs='?', help='Description in English or Spanish / Descripción en inglés o español')
    parser.add_argument('--lang', choices=('en', 'es'), default='es', help='Output language / Idioma de salida (es)')
    parser.add_argument('--export', type=Path, help='Export directory / Directorio de exportación')
    parser.add_argument('--json', action='store_true', help='Stable JSON keys / Claves JSON estables')
    args = parser.parse_args()
    data = load()
    if args.export:
        export(data, args.export)
    result = retrieve(args.description or locale(args.lang)['default_description'], data, args.lang)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        display(result, args.lang)


if __name__ == '__main__':
    main()
