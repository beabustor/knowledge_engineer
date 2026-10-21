import './style.css';
import { renderExplorer } from './explorer.ts';
import knowledge from '../data/knowledge.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import messages from './messages.json';
import { retrieve } from '../typescript/core.ts';

type Language = 'en' | 'es';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let lang: Language = navigator.language.startsWith('es') ? 'es' : 'en';
let result: ReturnType<typeof retrieve> | null = null;
let selected = '';
const input = $<HTMLTextAreaElement>('description');
const QUERY_LIMIT = 1000;
let liveTimer: ReturnType<typeof setTimeout>;
const labels = () => (lang === 'es' ? es : en).labels as Record<string, string>;
const m = () => messages[lang];
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}
function analyze() {
  input.setCustomValidity(input.value.length>QUERY_LIMIT ? (lang==='es'?'Máximo 1.000 caracteres':'Maximum 1,000 characters') : '');
  $('query-counter').textContent = `${input.value.length} / ${QUERY_LIMIT} ${lang==='es'?'caracteres':'characters'}`;
  if (!input.checkValidity()) { input.reportValidity(); return; }
  result = retrieve(input.value, knowledge, labels());
  selected = result.candidates[0]?.id ?? '';
  renderResults(); renderGraph();
}
function renderResults() {
  const host = $('results'); host.replaceChildren();
  $('count').textContent = result ? String(result.candidates.length) : '—';
  if (!result?.candidates.length) host.append(element('p', result ? m().noResults : m().empty, 'empty'));
  for (const candidate of result?.candidates ?? []) {
    const card = element('article', '', 'candidate' + (selected === candidate.id ? ' active' : ''));
    const heading = element('button', '', 'candidate-heading'); heading.type = 'button';
    heading.setAttribute('aria-pressed', String(selected === candidate.id));
    heading.append(element('span', candidate.label), element('span', `${candidate.score} ${m().score}`, 'score'));
    heading.addEventListener('click', () => { selected = candidate.id; renderResults(); renderGraph(); });
    card.append(heading);
    for (const field of ['matched', 'conflicts', 'unmentioned'] as const) {
      const row = element('div', '', `evidence ${field}`);
      row.append(element('span', m()[field], 'evidence-label'));
      row.append(element('span', candidate[field].map(id => labels()[id]).join(' · ') || m().none));
      card.append(row);
    }
    host.append(card);
  }
  const ambiguity = $('ambiguity'); ambiguity.replaceChildren();
  if (result && Object.keys(result.ambiguous).length) {
    ambiguity.append(element('h3', m().ambiguous));
    for (const [term, ids] of Object.entries(result.ambiguous)) {
      ambiguity.append(element('p', `${term} → ${ids.map(id => labels()[id]).join(' / ')}`));
    }
  }
}
function renderGraph() {
  const host = $('graph'); host.replaceChildren();
  const diseaseIds = Object.keys(knowledge.diseases);
  const symptomIds = Object.keys(knowledge.symptoms);
  const diseaseData = knowledge.diseases as Record<string, { symptoms: string[] }>;
  const selectedSymptoms = diseaseData[selected]?.symptoms ?? [];
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 900 390'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
  const diseaseY = (i: number) => 90 + i * 115;
  const symptomY = (i: number) => 50 + i * 70;
  diseaseIds.forEach((id, i) => diseaseData[id].symptoms.forEach(s => {
    const line = document.createElementNS(ns, 'path');
    const y1 = diseaseY(i), y2 = symptomY(symptomIds.indexOf(s));
    line.setAttribute('d', `M 275 ${y1} C 450 ${y1}, 450 ${y2}, 625 ${y2}`);
    line.setAttribute('class', id === selected || s === selected ? 'edge selected-edge' : 'edge');
    svg.append(line);
  }));
  host.append(svg);
  const left = element('div', '', 'graph-column diseases');
  const right = element('div', '', 'graph-column symptoms');
  left.append(element('h3', m().graphDisease)); right.append(element('h3', m().graphSymptom));
  function node(id: string, symptom: boolean) {
    const button = element('button', labels()[id], 'graph-node');
    button.type = 'button'; button.setAttribute('aria-pressed', String(selected === id));
    if (result?.positive.includes(id)) button.classList.add('positive');
    if (result?.negative.includes(id)) button.classList.add('negative');
    if (selected === id || (symptom && selectedSymptoms.includes(id))) button.classList.add('connected');
    button.addEventListener('click', () => { selected = id; renderResults(); renderGraph(); });
    return button;
  }
  diseaseIds.forEach((id, i) => {
    const button = node(id, false); button.style.top = `${diseaseY(i) / 390 * 100}%`; left.append(button);
  });
  symptomIds.forEach((id, i) => {
    const button = node(id, true); button.style.top = `${symptomY(i) / 390 * 100}%`; right.append(button);
  });
  host.append(left, right);
  $('legend').textContent = m().legend;
  renderExplorer(input.value, lang, Boolean(result), text => { input.value = text; analyze(); });
}
function renderLanguage() {
  document.documentElement.lang = lang;
  document.title = lang === 'es' ? 'Laboratorio de conocimiento · Knowledge Engineer' : 'Knowledge Studio · Knowledge Engineer';
  $<HTMLSelectElement>('language').value = lang;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const value = m()[el.dataset.i18n as keyof ReturnType<typeof m>];
    if (typeof value !== 'string') return;
    if (el.tagName === 'H1') { // Static translated title; no user HTML is inserted.
      el.replaceChildren(); value.split('<br>').forEach((part, i) => {
        if (i) el.append(document.createElement('br'));
        el.append(document.createTextNode(part));
      });
    } else el.textContent = value;
  });
  input.placeholder = m().texts[0];
  $('query-counter').textContent = `${input.value.length} / ${QUERY_LIMIT} ${lang==='es'?'caracteres':'characters'}`;
  const examples = $('examples'); examples.replaceChildren();
  m().examples.forEach((label, i) => {
    const button = element('button', label); button.type = 'button';
    button.addEventListener('click', () => { input.value = m().texts[i]; analyze(); }); examples.append(button);
  });
  if (result) result = retrieve(input.value, knowledge, labels());
  renderResults(); renderGraph();
}
$('analyze-form').addEventListener('submit', event => { event.preventDefault(); analyze(); });
// Editing invalidates old evidence so it is never presented as an analysis of new text.
input.addEventListener('input', () => {
  clearTimeout(liveTimer); input.setCustomValidity('');
  $('query-counter').textContent = `${input.value.length} / ${QUERY_LIMIT} ${lang==='es'?'caracteres':'characters'}`;
  result = null; selected = ''; renderResults(); renderGraph();
  if(input.value.trim() && input.value.length<=QUERY_LIMIT)liveTimer=setTimeout(analyze,350);
});
$('language').addEventListener('change', () => { lang = $<HTMLSelectElement>('language').value as Language; renderLanguage(); });
renderLanguage();
