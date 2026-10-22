import './styles/main.css';
import './styles/guided-case.css';
import { renderImpact } from './features/change-impact/dashboard.ts';
import { renderInterview } from './features/educational-interview.ts';
import { renderExplorer } from './features/text-annotation/explorer.ts';
import messages from './locales/interface.json';
type Language = 'en' | 'es';
const input = document.getElementById('description') as HTMLTextAreaElement;
const language = document.getElementById('language') as HTMLSelectElement;
let lang: Language = navigator.language.startsWith('es') ? 'es' : 'en';
let analyzed = true;
input.value = messages[lang].texts[0];
let timer: ReturnType<typeof setTimeout>;
const LIMIT = 100;
const annotationMode = new URLSearchParams(location.search).get('view') === 'annotation';
document.getElementById('text-workbench')!.hidden = !annotationMode;
(document.getElementById('text-workbench') as HTMLDetailsElement).open = annotationMode;
document.getElementById('impact-workbench')!.hidden = annotationMode;
document.querySelector<HTMLElement>('.hero')!.hidden = !annotationMode;
document.body.classList.toggle('guided-case', !annotationMode);
function render() {
  document.documentElement.lang = lang;
  language.value = lang;
  const text = messages[lang];
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const value = text[el.dataset.i18n as keyof typeof text];
    if (typeof value === 'string') el.textContent = value.replace('<br>', ' ');
  });
  if (!annotationMode) {
    renderImpact(lang);
    return;
  }
  input.placeholder =
    lang === 'es'
      ? 'Describe conceptos en hasta 100 caracteres'
      : 'Describe concepts in up to 100 characters';
  document.getElementById('query-counter')!.textContent =
    `${input.value.length} / ${LIMIT} ${lang === 'es' ? 'caracteres' : 'characters'}`;
  const examples = document.getElementById('examples')!;
  examples.replaceChildren();
  text.examples.forEach((label, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.onclick = () => {
      input.value = text.texts[i];
      analyze();
    };
    examples.append(button);
  });
  const confirmations = renderInterview(input.value, lang, analyzed, render);
  renderExplorer(
    input.value,
    lang,
    analyzed,
    (value) => {
      input.value = value;
      analyze();
    },
    confirmations,
  );
}
function analyze() {
  clearTimeout(timer);
  input.setCustomValidity(
    input.value.length > LIMIT
      ? lang === 'es'
        ? 'Máximo 100 caracteres'
        : 'Maximum 100 characters'
      : '',
  );
  if (!input.checkValidity()) {
    input.reportValidity();
    return;
  }
  analyzed = true;
  render();
}
document.getElementById('analyze-form')!.addEventListener('submit', (e) => {
  e.preventDefault();
  analyze();
});
input.addEventListener('input', () => {
  clearTimeout(timer);
  input.setCustomValidity('');
  analyzed = false;
  render();
  if (input.value.trim() && input.value.length <= LIMIT) timer = setTimeout(analyze, 350);
});
language.addEventListener('change', () => {
  lang = language.value as Language;
  render();
});
render();
