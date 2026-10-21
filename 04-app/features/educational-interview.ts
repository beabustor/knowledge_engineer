import {
  fromText,
  nextQuestion,
  compare,
  confirmationConcepts,
  profiles,
  MAX_QUESTIONS,
  type Answers,
  type Answer,
} from '../../03-pipelines/02-interview/engine.ts';
import type { Concept, Language } from '../../02-model/model.ts';
let textScope = '';
let answers: Answers = {};
let started = false;
let finished = false;
const el = (tag: string, text = '', cls = '') => {
  const e = document.createElement(tag);
  e.textContent = text;
  e.className = cls;
  return e;
};
export function renderInterview(
  text: string,
  lang: Language,
  analyzed: boolean,
  onChange: () => void,
): Concept[] {
  const host = document.getElementById('guided-interview')!;
  host.replaceChildren();
  const es = lang === 'es';
  if (text !== textScope) {
    textScope = text;
    answers = fromText(text);
    started = false;
    finished = false;
  }
  if (!analyzed) return [];
  host.append(el('h2', es ? 'Exploración guiada de ejemplo' : 'Illustrative guided exploration'));
  host.append(
    el(
      'p',
      es
        ? 'Confirma síntomas para comparar tres patrones educativos. Los códigos CIE-10 son referencias de categorías: esta entrevista no está validada para diagnosticar ni excluir enfermedades.'
        : 'Confirm symptoms to compare three educational patterns. ICD-10 codes reference categories; this interview is not validated to diagnose or exclude diseases.',
      'provenance',
    ),
  );
  const controls = el('div', '', 'examples');
  const button = el(
    'button',
    started
      ? es
        ? 'Reiniciar entrevista'
        : 'Restart interview'
      : es
        ? 'Explorar con preguntas'
        : 'Explore with questions',
  ) as HTMLButtonElement;
  button.type = 'button';
  button.onclick = () => {
    answers = fromText(text);
    started = true;
    finished = false;
    onChange();
  };
  controls.append(button);
  host.append(controls);
  if (!started) return [];
  const questionCount = Object.values(answers).filter((a) => a.origin === 'confirmation').length;
  const summary = el('div', '', 'interview-answers');
  for (const [id, a] of Object.entries(answers)) {
    const f = profiles.features.find((f) => f.id === id)!;
    const label =
      a.answer === 'yes'
        ? es
          ? 'Presente'
          : 'Present'
        : a.answer === 'no'
          ? es
            ? 'Ausente'
            : 'Absent'
          : es
            ? 'No sé'
            : 'Unknown';
    const row = el(
      'div',
      `${f.labels[lang]}: ${label} · ${a.origin === 'text' ? (es ? 'del texto' : 'from text') : es ? 'confirmado' : 'confirmed'}`,
    );
    const correct = el('button', es ? 'Corregir' : 'Correct') as HTMLButtonElement;
    correct.type = 'button';
    correct.onclick = () => {
      delete answers[id];
      finished = false;
      onChange();
    };
    row.append(correct);
    summary.append(row);
  }
  host.append(summary);
  const question = nextQuestion(answers);
  if (!finished && question && questionCount < MAX_QUESTIONS) {
    host.append(
      el('h3', `${es ? '¿Presentas' : 'Do you have'} ${question.labels[lang].toLowerCase()}?`),
      el('p', `${questionCount + 1} / ${MAX_QUESTIONS}`, 'hint'),
    );
    const choices = el('div', '', 'examples');
    for (const [value, label] of [
      ['yes', es ? 'Sí' : 'Yes'],
      ['no', es ? 'No' : 'No'],
      ['unknown', es ? 'No sé' : 'Unknown'],
    ] as [Answer, string][]) {
      const b = el('button', label) as HTMLButtonElement;
      b.type = 'button';
      b.dataset.answer = value;
      b.onclick = () => {
        answers[question.id] = { answer: value, origin: 'confirmation' };
        onChange();
      };
      choices.append(b);
    }
    host.append(choices);
    const stop = el(
      'button',
      es ? 'Terminar exploración' : 'Finish exploration',
    ) as HTMLButtonElement;
    stop.type = 'button';
    stop.onclick = () => {
      finished = true;
      onChange();
    };
    host.append(stop);
  } else
    host.append(
      el(
        'p',
        es
          ? 'Exploración terminada. No hay base validada para asignar una enfermedad. Puedes revisar las coincidencias de ejemplo.'
          : 'Exploration complete. There is no validated basis to assign a disease. Review the illustrative pattern matches.',
        'notice',
      ),
    );
  const table = el('table', '', 'preview-sheet');
  const header = el('tr');
  [
    es ? 'Patrón de ejemplo' : 'Example pattern',
    es ? 'A favor' : 'Supporting',
    es ? 'Rasgos ausentes' : 'Absent features',
    es ? 'Pendiente' : 'Unresolved',
  ].forEach((t) => header.append(el('th', t)));
  table.append(header);
  const label = (ids: string[]) =>
    ids.map((id) => profiles.features.find((f) => f.id === id)!.labels[lang]).join(', ') || '—';
  for (const result of compare(answers)) {
    const row = el('tr');
    const cell = el('td');
    const link = el(
      'a',
      result.pattern.labels[lang] + ' · ' + result.pattern.reference_code,
    ) as HTMLAnchorElement;
    link.href = result.pattern.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    cell.append(link);
    row.append(
      cell,
      el('td', label(result.support)),
      el('td', label(result.absent)),
      el('td', label(result.unresolved)),
    );
    table.append(row);
  }
  const wrap = el('div', '', 'sheet-wrapper');
  wrap.append(table);
  host.append(wrap);
  host.append(
    el(
      'p',
      es
        ? 'Un rasgo ausente no descarta clínicamente una enfermedad. No se calculan probabilidades ni recomendaciones de tratamiento.'
        : 'An absent feature does not clinically rule out a disease. No probabilities or treatment recommendations are calculated.',
      'hint',
    ),
  );
  return confirmationConcepts(answers);
}
