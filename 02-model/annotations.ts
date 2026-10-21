/** Human review is about a text annotation, never clinical validation or class equivalence. */
import { normalize } from './02-text/normalization.ts';
import { isNegated } from './02-text/clinical-language.ts';
import type { Concept } from './model.ts';
export type Review = 'pending' | 'accepted' | 'rejected';
export type Annotation = {
  id: string;
  span: string;
  query: string;
  candidate: Concept;
  review: Review;
  at: string;
};
export function locateSpan(text: string, span: string) {
  const value = normalize(span.trim());
  if (!value) return null;
  const input = normalize(text);
  let start = input.indexOf(value);
  while (start >= 0) {
    if (
      !/[\p{L}\p{N}_]/u.test(input[start - 1] ?? '') &&
      !/[\p{L}\p{N}_]/u.test(input[start + value.length] ?? '')
    )
      return { start, negated: isNegated(input, start) };
    start = input.indexOf(value, start + value.length);
  }
  return null;
}
export function annotationConcepts(text: string, annotations: Annotation[]): Concept[] {
  if (!annotations.length) return [];
  const common = {
    domain: 'annotation',
    aliases: { en: [], es: [] },
    source: 'User-reviewed text annotations / Anotaciones revisadas por el usuario',
    version: '1',
    url: 'https://github.com/beabustor/knowledge_engineer',
    status: 'reported',
  };
  return [
    {
      ...common,
      id: 'TextAnnotation',
      kind: 'entity',
      labels: { en: 'Text annotation', es: 'Anotación de texto' },
    },
    ...['evidenceText', 'reviewStatus', 'mentionPolarity', 'sourceIdentifier', 'sourceIRI'].map(
      (id) => ({
        ...common,
        id,
        kind: 'attribute',
        domainId: 'TextAnnotation',
        rangeId: 'string',
        labels: {
          en: id,
          es: {
            evidenceText: 'Fragmento de evidencia',
            reviewStatus: 'Estado de revisión',
            mentionPolarity: 'Polaridad de mención',
            sourceIdentifier: 'Identificador de fuente',
            sourceIRI: 'IRI de fuente',
          }[id]!,
        },
      }),
    ),
    {
      ...common,
      id: 'candidateMatch',
      kind: 'annotation',
      labels: { en: 'Candidate annotation target', es: 'Destino candidato de anotación' },
    },
    ...annotations.flatMap((a) => {
      const evidence = locateSpan(text, a.span);
      if (!evidence || a.query !== text) return [];
      return [
        {
          ...common,
          id: a.id,
          kind: 'individual',
          classId: 'TextAnnotation',
          labels: {
            en: `${a.span} · ${a.review}`,
            es: `${a.span} · ${{ pending: 'pendiente', accepted: 'aceptada', rejected: 'rechazada' }[a.review]}`,
          },
          retrievedAt: a.at,
          properties: [
            { property: 'sourceIdentifier', value: a.candidate.code ?? a.candidate.id },
            { property: 'sourceIRI', value: a.candidate.url },
            { property: 'evidenceText', value: a.span },
            { property: 'reviewStatus', value: a.review },
            { property: 'mentionPolarity', value: evidence.negated ? 'negated' : 'mentioned' },
            ...(a.review === 'rejected'
              ? []
              : [{ property: 'candidateMatch', target: a.candidate.id }]),
          ],
        },
      ];
    }),
  ];
}
