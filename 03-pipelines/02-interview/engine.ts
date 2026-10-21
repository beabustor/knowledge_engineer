import profiles from './profiles.json' with { type: 'json' };
import { normalize } from '../../02-model/02-text/normalization.ts';
import { isNegated } from '../../02-model/02-text/clinical-language.ts';
import type { Concept, Language } from '../../02-model/model.ts';
export type Answer = 'yes' | 'no' | 'unknown';
export type Answers = Record<string, { answer: Answer; origin: 'text' | 'confirmation' }>;
export const MAX_QUESTIONS = 5;
export function fromText(text: string): Answers {
  const input = normalize(text);
  const answers: Answers = {};
  for (const f of profiles.features)
    for (const term of f.terms) {
      const target = normalize(term);
      let pos = input.indexOf(target);
      while (pos >= 0) {
        const before = input[pos - 1] ?? '',
          after = input[pos + target.length] ?? '';
        if (!/[\p{L}\p{N}_]/u.test(before) && !/[\p{L}\p{N}_]/u.test(after))
          answers[f.id] = { answer: isNegated(input, pos) ? 'no' : 'yes', origin: 'text' };
        pos = input.indexOf(target, pos + target.length);
      }
    }
  return answers;
}
export function compare(answers: Answers) {
  return profiles.patterns.map((pattern) => ({
    pattern,
    support: pattern.features.filter((id) => answers[id]?.answer === 'yes'),
    absent: pattern.features.filter((id) => answers[id]?.answer === 'no'),
    unresolved: pattern.features.filter((id) => !answers[id] || answers[id].answer === 'unknown'),
  }));
}
export function nextQuestion(answers: Answers) {
  const remaining = profiles.features.filter((f) => !answers[f.id]);
  if (!remaining.length) return null;
  // A coverage heuristic, not a disease probability or clinical decision rule.
  const observed = Object.entries(answers)
    .filter(([, v]) => v.answer === 'yes')
    .map(([id]) => id);
  const relevant = profiles.patterns.filter((p) => p.features.some((id) => observed.includes(id)));
  const patterns = relevant.length ? relevant : profiles.patterns;
  return remaining
    .map((feature) => ({
      feature,
      coverage: patterns.filter((p) => p.features.includes(feature.id)).length,
    }))
    .sort((a, b) => b.coverage - a.coverage || a.feature.id.localeCompare(b.feature.id))[0].feature;
}
export function confirmationConcepts(answers: Answers): Concept[] {
  const confirmed = Object.entries(answers).filter(([, a]) => a.origin === 'confirmation');
  if (!confirmed.length) return [];
  const common = {
    domain: 'modeling',
    source: 'Educational interview / Entrevista educativa',
    version: profiles.version,
    url: 'https://github.com/beabustor/knowledge_engineer',
    status: 'reported',
    aliases: { en: [], es: [] },
  };
  return [
    {
      ...common,
      id: 'ConfirmedFinding',
      kind: 'entity',
      labels: { en: 'Confirmed interview answer', es: 'Respuesta de entrevista' },
    },
    {
      ...common,
      id: 'answerState',
      kind: 'attribute',
      domainId: 'ConfirmedFinding',
      rangeId: 'string',
      labels: { en: 'Answer state', es: 'Estado de respuesta' },
    },
    ...confirmed.map(([id, a]) => {
      const f = profiles.features.find((f) => f.id === id)!;
      return {
        ...common,
        id: 'Answer_' + id,
        kind: 'individual',
        classId: 'ConfirmedFinding',
        labels: {
          en: `${f.labels.en}: ${a.answer}`,
          es: `${f.labels.es}: ${{ yes: 'sí', no: 'no', unknown: 'no sé' }[a.answer]}`,
        },
        properties: [{ property: 'answerState', value: a.answer }],
      };
    }),
  ];
}
export { profiles };
