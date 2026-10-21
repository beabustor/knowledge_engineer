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


def retrieve(text, data):
    text = normalize(text)
    positive, negative = set(), set()
    for concept, terms in data['symptoms'].items():
        for term in terms:
            for match in re.finditer(r'(?<!\w)' + re.escape(normalize(term)) + r'(?!\w)', text):
                prefix = re.split(r'[.,;:!?\n]|\b(?:pero|aunque)\b', text[:match.start()])[-1]
                target = negative if re.search(r'\b(?:sin|no|niego)\b', prefix) else positive
                target.add(concept)
    ambiguous = {term: senses for term, senses in data['ambiguous'].items()
                 if re.search(r'(?<!\w)' + re.escape(normalize(term)) + r'(?!\w)', text)}
    candidates = []
    for concept, disease in data['diseases'].items():
        symptoms = set(disease['symptoms'])
        matched, conflicts = symptoms & positive, symptoms & negative
        if matched:
            candidates.append(dict(id=concept, label=disease['label'],
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
           'ex:Ontology a owl:Ontology ; rdfs:comment "Synthetic educational data"@en .',
           'ex:hasSymptom a owl:ObjectProperty .',
           'ex:denotes a owl:AnnotationProperty .']
    cypher = []
    concepts = {'Disease': 'Enfermedad', 'Symptom': 'Síntoma',
                'RespiratoryDisease': 'Enfermedad respiratoria'}
    concepts.update({k: v[0] for k, v in data['symptoms'].items()})
    concepts.update({k: v['label'] for k, v in data['diseases'].items()})
    for senses in data['ambiguous'].values():
        concepts.update({s: s for s in senses})
    for cid, label in concepts.items():
        ttl.append(f'ex:{cid} a owl:Class ; rdfs:label {quote(label)}@es .')
        cypher.append(f'MERGE (c:KnowledgeDemo:Concept {{id: {quote(cid)}}}) SET c.label = {quote(label)};')
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
        ttl.append(f'ex:term{i} rdfs:label {quote(term)}@es .')
        for cid in senses:
            ttl.append(f'ex:term{i} ex:denotes ex:{cid} .')
            cypher.append(f'MERGE (t:KnowledgeDemo:Term {{label: {quote(term)}}}) WITH t MATCH (c:KnowledgeDemo:Concept {{id: {quote(cid)}}}) MERGE (t)-[:DENOTES]->(c);')
    (directory / 'knowledge.ttl').write_text('\n'.join(ttl) + '\n', encoding='utf-8')
    (directory / 'knowledge.cypher').write_text('\n'.join(cypher) + '\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('description', nargs='?', default='Tengo fiebre, tos y dolor de garganta')
    parser.add_argument('--export', type=Path)
    args = parser.parse_args()
    data = load()
    if args.export:
        export(data, args.export)
    print('EJEMPLO SINTÉTICO: candidatos, no diagnóstico ni probabilidades')
    print(json.dumps(retrieve(args.description, data), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
