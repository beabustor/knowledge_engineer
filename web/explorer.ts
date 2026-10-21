import { renderKnowledgeGraph } from './knowledge-graph.ts';
import { lookup, type Source } from './public-lookup.ts';
import catalog from '../data/catalog.json';
import { reportedConcepts } from '../explorer/observations.ts';
import texts from './explorer-messages.json';
import { matchConcepts, representations, displayLabel, type Concept, type Language } from '../explorer/model.ts';
const builtin: Concept[] = catalog.concepts;
let remote:Concept[]=[];
let remoteBusy=false;
let remoteState='';
let remoteTerm='';
let remoteSource:Source='ols';
const candidateLinks=new Map<string,string[]>();
let remoteVersion=0;
let cachedRemoteVersion=-1;
let concepts: Concept[] = [...builtin];


let refresh = () => {};
let downloadUrl = '';
let selected = '';
let queryText:string|null=null;
let requestGeneration=0;
let advancedOpen=false;
let technicalOpen=false;
let tab: 'sheet' | 'graph' | 'rdf' | 'owl' | 'cypher' | 'sql' | 'protege' = 'sheet';
let domain = 'all';
let lastText = '';
let matchCache: {text:string;domain:string;concepts:Concept[];results:ReturnType<typeof matchConcepts>} | null = null;
let cachedText='';
let cachedAnalyzed=false;
let confirmationSignature='';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') {
 const node = document.createElement(tag); node.textContent = text; node.className = cls; return node;
}
export function renderExplorer(text: string, lang: Language, analyzed: boolean, pick: (text: string) => void, confirmations:Concept[] = []) {
 const previousAdvanced=document.querySelector<HTMLDetailsElement>('.advanced-controls');if(previousAdvanced)advancedOpen=previousAdvanced.open;
 const previousTechnical=document.querySelector<HTMLDetailsElement>('.technical-views');if(previousTechnical)technicalOpen=previousTechnical.open;
 const t = texts[lang];
 if(queryText!==text){
  queryText=text;requestGeneration++;selected='';domain='all';tab='sheet';lastText='';matchCache=null;
  remote=[];candidateLinks.clear();remoteState='';remoteTerm='';remoteBusy=false;remoteVersion++;
 }

 refresh = () => renderExplorer(text,lang,analyzed,pick,confirmations);
 if(confirmationSignature!==JSON.stringify(confirmations)||cachedText!==text||cachedAnalyzed!==analyzed||cachedRemoteVersion!==remoteVersion){
  concepts=[...builtin,...(analyzed?reportedConcepts(text):[]),...remote,...confirmations];
  concepts=concepts.map(c=>candidateLinks.has(c.id)?{...c,properties:[...(c.properties??[]),...candidateLinks.get(c.id)!.map(target=>({property:'candidateMatch',target}))]}:c);
  if(candidateLinks.size)concepts.push({id:'candidateMatch',kind:'annotation',domain:'biomedical',labels:{en:'Candidate match (unverified)',es:'Coincidencia candidata (sin verificar)'},aliases:{en:[],es:[]},source:'Local lookup association',version:'1',url:'https://github.com/beabustor/knowledge_engineer',status:'local'});
  confirmationSignature=JSON.stringify(confirmations);
  cachedRemoteVersion=remoteVersion;
  cachedText=text;cachedAnalyzed=analyzed;
 }

 const host = document.getElementById('concept-explorer')!; host.replaceChildren();
 host.append(el('h2',lang==='es'?'Evidencia y procedencia':'Evidence and provenance'));
 const advanced=el('details','','advanced-controls');const summary=el('summary',lang==='es'?'Exploración avanzada y fuentes externas':'Advanced exploration and external sources');advanced.append(summary);advanced.open=advancedOpen;
 const external=el('section','','source-panel');external.append(el('h3',t.externalTitle),el('p',t.externalHelp,'hint'),el('p',t.externalLimit,'provenance'));
 const sourceLabel=el('label',t.externalSource+' ');const provider=el('select');provider.id='lookup-source';
 for(const [id,name] of [['ols','OLS · EMBL-EBI'],['cima','CIMA · AEMPS']]){const option=el('option',name);option.value=id;provider.append(option);}provider.value=remoteSource;
 provider.addEventListener('change',()=>{remoteSource=provider.value as Source;});sourceLabel.append(provider);
 const termLabel=el('label',t.externalTerm+' ');const term=el('input');term.id='lookup-term';term.maxLength=80;term.placeholder=lang==='es'?'Escribe un término':'Enter a term';term.value=remoteTerm;term.addEventListener('input',()=>{remoteTerm=term.value;});termLabel.append(term);
 const button=el('button',remoteBusy?t.loading:t.externalSearch,'linked-concept');button.type='button';button.disabled=remoteBusy;
 button.addEventListener('click',async()=>{
  remoteTerm=term.value.trim();const generation=requestGeneration;const anchor=selected;remote=[];candidateLinks.clear();remoteVersion++;remoteBusy=true;remoteState=t.loading;refresh();
  try{
   const result=await lookup(remoteSource,remoteTerm);
   if(generation!==requestGeneration)return;
   const unique=new Map(remote.map(c=>[c.id,c]));result.concepts.forEach(c=>unique.set(c.id,c));remote=[...unique.values()].slice(-100);
   const retained=new Set(remote.map(c=>c.id));
   for(const [id,targets] of candidateLinks)candidateLinks.set(id,targets.filter(target=>retained.has(target)));
   if(result.concepts.length)candidateLinks.set(anchor,[...new Set([...(candidateLinks.get(anchor)??[]),...result.concepts.map(c=>c.id)])]);
   remoteVersion++;remoteState=`${result.concepts.length} ${t.externalResults}${result.cached?' · cache':''}`;
  }catch(error){if(generation!==requestGeneration)return;remoteState=t.externalError+' '+(error instanceof Error?error.message:'');}
  finally{if(generation===requestGeneration){remoteBusy=false;refresh();}}
 });
 external.append(sourceLabel,termLabel,button,el('p',remoteState,'hint'));
 const matchesPanel=el('div','','examples');remote.forEach(c=>{const b=el('button',displayLabel(c,lang)+' · '+c.code);b.type='button';b.addEventListener('click',()=>{domain='all';selected=c.id;refresh();});matchesPanel.append(b);});external.append(matchesPanel);advanced.append(external);
 const palette=el('div','','model-palette');
 for(const [kind,id] of [['entity','Person'],['attribute','age'],['relationship','performedBy'],['action','MeasureTemperature'],['individual','SampleMeasurement']] as const){
  const button=el('button',t.kinds[kind]+' · '+concepts.find(c=>c.id===id)!.labels[lang]);button.type='button';
  button.addEventListener('click',()=>{domain='modeling';selected=id;renderExplorer(text,lang,analyzed,pick,confirmations);});palette.append(button);
 }
 advanced.append(palette);
 const label = el('label',t.domain+' '); const select = el('select'); select.id='catalog-domain';
 for(const [id,name] of [['all',t.all],['clinical',t.clinical],['chemical',t.chemical],['modeling',t.modeling]]) {
  const option=el('option',name);option.value=id;select.append(option);
 }
 select.value=domain;label.append(select);advanced.append(label);
 select.addEventListener('change',()=>{domain=select.value;renderExplorer(text,lang,analyzed,pick,confirmations);});
 if(!matchCache||matchCache.text!==text||matchCache.domain!==domain||matchCache.concepts!==concepts)matchCache={text,domain,concepts,results:analyzed?matchConcepts(text,concepts,domain):[]};
 const matches=matchCache.results;
 if (analyzed && text !== lastText && matches.length) selected = matches[0].concept.id;
 if(analyzed) lastText = text;
 const available = concepts.filter(c=>domain==='all'||c.domain===domain);
 if(selected&&!available.some(c=>c.id===selected)) selected='';
 advanced.append(el('h3',t.browse));
 const browse=el('div','','examples');
 available.filter(c=>c.status!=='imported').slice(0,30).forEach(c=>{
  const button=el('button',`${displayLabel(c,lang)} · ${c.code??t.kinds[(c.kind??'entity') as keyof typeof t.kinds]}`);button.type='button';button.setAttribute('aria-pressed',String(c.id===selected));
  button.addEventListener('click',()=>{selected=c.id;pick(c.aliases[lang][0]??displayLabel(c,lang));});browse.append(button);
 });advanced.append(browse);
 if(analyzed) {
  host.append(el('h3',t.matches));
  if(!matches.length)host.append(el('p',t.noMatch,'hint'));
  for(const {concept,evidence} of matches) {
   const card=el('div','','concept-match');const button=el('button',`${displayLabel(concept,lang)} · ${concept.code??concept.id}`);button.type='button';
   button.addEventListener('click',()=>{selected=concept.id;renderExplorer(text,lang,analyzed,pick,confirmations);});
   card.append(button,el('p',evidence.map(e=>`${e.term}: ${e.negated?t.negated:t.mentioned}`).join(' · '),'hint'));host.append(card);
  }
 }
 const observations=concepts.filter(c=>c.status==='reported'&&c.kind==='individual');
 if(observations.length){
  host.append(el('h3',t.observedTitle),el('p',t.observedHelp,'hint'));
  const values=el('div','','examples');
  observations.forEach(c=>{const button=el('button',displayLabel(c,lang));button.type='button';button.id='observation-'+c.id;
   button.addEventListener('click',()=>{selected=c.id;domain='modeling';renderExplorer(text,lang,analyzed,pick,confirmations);});values.append(button);});host.append(values);
 }
 renderKnowledgeGraph(concepts,lang,selected,id=>{domain='all';const original=builtin.find(c=>c.id===id);selected=concepts.find(c=>c.id===id)?.id??concepts.find(c=>original?.code&&c.code===original.code)?.id??id;tab='sheet';technicalOpen=true;document.querySelector<HTMLDetailsElement>('.technical-views')?.setAttribute('open','');refresh();document.getElementById('concept-explorer')?.scrollIntoView({behavior:'smooth',block:'start'});}, text.trim()? [...new Set([...matches.map(r=>r.concept.id),...observations.map(c=>c.id),...(selected?[selected]:[])])]:[],text);
 host.append(advanced);
 if(!selected){host.append(el('p',lang==='es'?'Selecciona un concepto encontrado para ver sus representaciones.':'Select a matched concept to view its representations.','hint'));return;}
 const c=concepts.find(c=>c.id===selected)!;
 const detail=el('div','','concept-detail');detail.append(el('h3',displayLabel(c,lang)),el('p',c.status==='reference'?t.reference:c.status==='remote'?t.remoteCandidate:c.status==='imported'?t.imported:c.status==='reported'?t.reported:t.local,'hint'));
 const source=el('a',`${t.source}: ${c.status==='local'?t.local:c.source} · ${c.code??c.id}`);source.href=c.url;source.target='_blank';source.rel='noopener noreferrer';detail.append(source,el('p',`${t.version}: ${c.version}`,'hint'));
 detail.append(el('p',t.kinds[(c.kind??'entity') as keyof typeof t.kinds]));
 if(c.domain==='modeling'&&c.status==='local') detail.append(el('p',t.fixture,'hint'));
 if(c.formula) detail.append(el('p',`${t.formula}: ${c.formula}`));host.append(detail);
 const technical=el('details','','technical-views');technical.id='technical-views';technical.open=technicalOpen;technical.append(el('summary',lang==='es'?'Ver representaciones RDF / OWL / Neo4j / SQL':'Inspect RDF / OWL / Neo4j / SQL representations'));
 const tabs=el('div','','representation-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',t.title);
 const names={sheet:t.sheet,graph:t.graph,rdf:'RDF / Turtle',owl:'OWL / RDF/XML',cypher:'Neo4j / Cypher',sql:'SQL',protege:t.protege};
 for(const key of Object.keys(names) as (keyof typeof names)[]) {
  const button=el('button',names[key]);button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-selected',String(tab===key));button.id=`view-${key}`;button.setAttribute('aria-controls','representation-panel');
  button.addEventListener('click',()=>{tab=key;renderExplorer(text,lang,analyzed,pick,confirmations);document.getElementById(`view-${key}`)?.focus();});
  button.addEventListener('keydown', event=>{
   const keys=Object.keys(names) as (keyof typeof names)[];let next=keys.indexOf(key);
   if(event.key==='ArrowRight')next=(next+1)%keys.length;else if(event.key==='ArrowLeft')next=(next-1+keys.length)%keys.length;else return;
   event.preventDefault();tab=keys[next];renderExplorer(text,lang,analyzed,pick,confirmations);document.getElementById(`view-${tab}`)?.focus();
  });tabs.append(button);
 }technical.append(tabs);
 const panel=el('div','','representation-panel');panel.id='representation-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',`view-${tab}`);
 const outputs=representations(c,concepts);
 const follow = (id:string) => {
  const target=concepts.find(c=>c.id===id);
  const button=el('button',target?.labels[lang]??id,'linked-concept');button.type='button';
  button.addEventListener('click',()=>{selected=id;if(target && domain!=='all' && target.domain!==domain)domain=target.domain;renderExplorer(text,lang,analyzed,pick,confirmations);});return button;
 };
 if(tab==='sheet'){
  panel.append(el('p',t.sheetHelp,'hint'));
  const wrapper=el('div','','sheet-wrapper');const table=el('table','','preview-sheet');const thead=el('thead');const h=el('tr');
  [t.subject,t.predicate,t.object].forEach(v=>h.append(el('th',v)));thead.append(h);table.append(thead);const body=el('tbody');
  for(const line of outputs.rdf.split('\n').filter(line=>line&&!line.startsWith('@'))){
   const parts=line.match(/^(\S+) (\S+) (.+) \.$/);if(!parts)continue;
   const row=el('tr');parts.slice(1).forEach(v=>row.append(el('td',v)));body.append(row);
  }table.append(body);wrapper.append(table);panel.append(wrapper);
 }else if(tab==='graph') {
  panel.append(el('p',t.graphExplain,'hint'));
  const graph=el('div','','semantic-graph');graph.append(el('strong',displayLabel(c,lang)));
  for(const [label,id] of [[t.parent,c.parent],[t.instance,c.classId],[t.domainLabel,c.domainId],[t.range,c.rangeId]]){
   if(id){graph.append(el('span','→ '+label+' →'));graph.append(concepts.some(c=>c.id===id)?follow(id):el('code',id));}
  }
  if(c.formula)graph.append(el('span',`→ ${t.formula} →`),el('code',c.formula));
  for(const property of c.properties??[]){
   graph.append(el('span','→'));graph.append(follow(property.property));graph.append(el('span','→'));
   graph.append(property.target?follow(property.target):el('code',String(property.value)));
  }
  panel.append(graph);
 }else if(tab==='protege'){
  panel.append(el('p',t.instructions,'hint'));
  const tree=el('div','','ontology-tree');
  for(const kind of ['entity','action','attribute','relationship','annotation','individual'] as const){
   const section=el('section');section.append(el('h3',t.kinds[kind]));
   concepts.filter(n=>(n.kind??'entity')===kind).forEach(n=>section.append(follow(n.id)));tree.append(section);
  }
  panel.append(tree,el('h3',displayLabel(c,lang)));
  const table=el('dl','','ontology-inspector');
  const entries: [string,string][]=[[t.code,c.code??c.id],[t.source,c.source],[t.version,c.version]];
  if(c.parent)entries.push([t.parent,concepts.find(n=>n.id===c.parent)!.labels[lang]]);
  if(c.classId)entries.push([t.instance,concepts.find(n=>n.id===c.classId)!.labels[lang]]);
  if(c.domainId)entries.push([t.domainLabel,concepts.find(n=>n.id===c.domainId)!.labels[lang]]);
  if(c.rangeId)entries.push([t.range,concepts.find(n=>n.id===c.rangeId)?.labels[lang]??c.rangeId]);
  for(const p of c.properties??[])entries.push([concepts.find(n=>n.id===p.property)!.labels[lang],p.target?concepts.find(n=>n.id===p.target)!.labels[lang]:String(p.value)]);
  for(const [k,v] of entries)table.append(el('dt',k),el('dd',v));panel.append(table);
 }else {
  panel.append(el('p',t[`${tab}Explain`],'hint'));
  const pre=el('pre');pre.append(el('code',outputs[tab]));panel.append(pre);
 }
 const format=tab==='sheet'||tab==='graph'?'rdf':tab==='protege'?'owl':tab;
 const chosenOutput=outputs[format];
 if(downloadUrl)URL.revokeObjectURL(downloadUrl);
 downloadUrl=URL.createObjectURL(new Blob([chosenOutput],{type:'text/plain;charset=utf-8'}));
 const download=el('a',t.download,'representation-download');download.id='representation-download';download.href=downloadUrl;download.download=`${c.id}.${format==='rdf'?'ttl':format==='cypher'?'cypher':format==='owl'?'owl':'sql'}`;
 panel.append(download);technical.append(panel);host.append(technical);

}
