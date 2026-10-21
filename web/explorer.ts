import catalog from '../data/catalog.json';
import { reportedConcepts } from '../explorer/observations.ts';
import { readCatalogFile } from './import-catalog.ts';
import excelSnapshot from '../data/sources/cie10/cie10.xls?url';
import texts from './explorer-messages.json';
import { matchConcepts, representations, type Concept, type Language } from '../explorer/model.ts';
const builtin: Concept[] = catalog.concepts;
let imported: Concept[] = [];
let concepts: Concept[] = [...builtin];
let sourceState = '';
let sourceAttempted = false;
let loading = false;
let refresh = () => {};
let downloadUrl = '';
const excelUrl=excelSnapshot;
const excelSource='https://github.com/verasativa/CIE-10/blob/8e22d45e932badbc344f81e18e677a655ab3bc3a/cie10.xls';
let selected = 'Cough';
let tab: 'sheet' | 'graph' | 'rdf' | 'owl' | 'cypher' | 'sql' | 'protege' = 'sheet';
let domain = 'all';
let lastText = '';
let matchCache: {text:string;domain:string;concepts:Concept[];results:ReturnType<typeof matchConcepts>} | null = null;
let cachedImported:Concept[]|null=null;
let cachedText='';
let cachedAnalyzed=false;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') {
 const node = document.createElement(tag); node.textContent = text; node.className = cls; return node;
}
export function renderExplorer(text: string, lang: Language, analyzed: boolean, pick: (text: string) => void) {
 const t = texts[lang];
 refresh = () => renderExplorer(text,lang,analyzed,pick);
 if(cachedImported!==imported||cachedText!==text||cachedAnalyzed!==analyzed){
  const importedCodes=new Set(imported.map(c=>c.code));
  concepts=[...builtin.filter(c=>!c.code||!importedCodes.has(c.code)),...imported,...(analyzed?reportedConcepts(text):[])];
  cachedImported=imported;cachedText=text;cachedAnalyzed=analyzed;
 }
 const host = document.getElementById('concept-explorer')!; host.replaceChildren();
 host.append(el('h2',t.title),el('p',t.intro,'hint'),el('p',catalog.provenance[lang],'provenance'));
 const sourcePanel=el('section','','source-panel');sourcePanel.append(el('h3',t.sourceTitle),el('p',t.sourceHelp,'hint'));
 const loadButton=el('button',loading?t.loading:t.loadExcel,'linked-concept');loadButton.type='button';loadButton.disabled=loading;
 const fileLabel=el('label',t.localFile+' ');const file=el('input');file.type='file';file.accept='.xls,.xlsx,.csv';file.id='catalog-file';file.disabled=loading;fileLabel.append(file);
 async function load(bytes:Promise<ArrayBuffer>,name:string,url:string){
  loading=true;sourceState=t.loading;renderExplorer(text,lang,analyzed,pick);
  try{imported=await readCatalogFile(await bytes,name,builtin,url);sourceState=`${imported.length} ${t.loaded}`;lastText='';}
  catch(error){sourceState=t.loadError+' '+(error instanceof Error?error.message:'');}
  finally{loading=false;refresh();}
 }
 loadButton.addEventListener('click',()=>load((async()=>{
  const response=await fetch(excelUrl,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const length=Number(response.headers.get('Content-Length'));if(length>8000000)throw new Error('Maximum 8 MB');
  return response.arrayBuffer();
 })(),'cie10.xls',excelSource));
 file.addEventListener('change',()=>{const chosen=file.files?.[0];if(chosen){
  if(chosen.size>8000000){sourceState=t.loadError+' Maximum 8 MB';renderExplorer(text,lang,analyzed,pick);return;}
  void load(chosen.arrayBuffer(),chosen.name,'https://github.com/verasativa/CIE-10');
 }});
 const clear=el('button',t.clearSource,'linked-concept');clear.type='button';clear.disabled=!imported.length||loading;
 clear.addEventListener('click',()=>{imported=[];sourceState='';lastText='';renderExplorer(text,lang,analyzed,pick);});
 sourcePanel.append(loadButton,fileLabel,clear,el('p',sourceState,'hint'));host.append(sourcePanel);
 if(analyzed&&!sourceAttempted){sourceAttempted=true;queueMicrotask(()=>loadButton.click());}
 const palette=el('div','','model-palette');
 for(const [kind,id] of [['entity','Person'],['attribute','age'],['relationship','performedBy'],['action','MeasureTemperature'],['individual','SampleMeasurement']] as const){
  const button=el('button',t.kinds[kind]+' · '+concepts.find(c=>c.id===id)!.labels[lang]);button.type='button';
  button.addEventListener('click',()=>{domain='modeling';selected=id;renderExplorer(text,lang,analyzed,pick);});palette.append(button);
 }
 host.append(palette);
 const label = el('label',t.domain+' '); const select = el('select'); select.id='catalog-domain';
 for(const [id,name] of [['all',t.all],['clinical',t.clinical],['chemical',t.chemical],['modeling',t.modeling]]) {
  const option=el('option',name);option.value=id;select.append(option);
 }
 select.value=domain;label.append(select);host.append(label);
 select.addEventListener('change',()=>{domain=select.value;renderExplorer(text,lang,analyzed,pick);});
 if(!matchCache||matchCache.text!==text||matchCache.domain!==domain||matchCache.concepts!==concepts)matchCache={text,domain,concepts,results:analyzed?matchConcepts(text,concepts,domain):[]};
 const matches=matchCache.results;
 if (analyzed && text !== lastText && matches.length) selected = matches[0].concept.id;
 if(analyzed) lastText = text;
 const available = concepts.filter(c=>domain==='all'||c.domain===domain);
 if(!available.some(c=>c.id===selected)) selected=available[0]?.id ?? 'Cough';
 host.append(el('h3',t.browse));
 const browse=el('div','','examples');
 available.slice(0,60).forEach(c=>{
  const button=el('button',`${c.labels[lang]} · ${c.code??t.kinds[(c.kind??'entity') as keyof typeof t.kinds]}`);button.type='button';button.setAttribute('aria-pressed',String(c.id===selected));
  button.addEventListener('click',()=>{selected=c.id;pick(c.aliases[lang][0]??c.labels[lang]);});browse.append(button);
 });host.append(browse);
 if(analyzed) {
  host.append(el('h3',t.matches));
  if(!matches.length)host.append(el('p',t.noMatch,'hint'));
  for(const {concept,evidence} of matches) {
   const card=el('div','','concept-match');const button=el('button',`${concept.labels[lang]} · ${concept.code??concept.id}`);button.type='button';
   button.addEventListener('click',()=>{selected=concept.id;renderExplorer(text,lang,analyzed,pick);});
   card.append(button,el('p',evidence.map(e=>`${e.term}: ${e.negated?t.negated:t.mentioned}`).join(' · '),'hint'));host.append(card);
  }
 }
 const observations=concepts.filter(c=>c.status==='reported'&&c.kind==='individual');
 if(observations.length){
  host.append(el('h3',t.observedTitle),el('p',t.observedHelp,'hint'));
  const values=el('div','','examples');
  observations.forEach(c=>{const button=el('button',c.labels[lang]);button.type='button';button.id='observation-'+c.id;
   button.addEventListener('click',()=>{selected=c.id;domain='modeling';renderExplorer(text,lang,analyzed,pick);});values.append(button);});host.append(values);
 }
 const c=concepts.find(c=>c.id===selected)!;
 const detail=el('div','','concept-detail');detail.append(el('h3',c.labels[lang]),el('p',c.status==='reference'?t.reference:c.status==='imported'?t.imported:c.status==='reported'?t.reported:t.local,'hint'));
 const source=el('a',`${t.source}: ${c.status==='local'?t.local:c.source} · ${c.code??c.id}`);source.href=c.url;source.target='_blank';source.rel='noopener noreferrer';detail.append(source,el('p',`${t.version}: ${c.version}`,'hint'));
 detail.append(el('p',t.kinds[(c.kind??'entity') as keyof typeof t.kinds]));
 if(c.domain==='modeling'&&c.status==='local') detail.append(el('p',t.fixture,'hint'));
 if(c.formula) detail.append(el('p',`${t.formula}: ${c.formula}`));host.append(detail);
 const tabs=el('div','','representation-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',t.title);
 const names={sheet:t.sheet,graph:t.graph,rdf:'RDF / Turtle',owl:'OWL / RDF/XML',cypher:'Neo4j / Cypher',sql:'SQL',protege:t.protege};
 for(const key of Object.keys(names) as (keyof typeof names)[]) {
  const button=el('button',names[key]);button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-selected',String(tab===key));button.id=`view-${key}`;button.setAttribute('aria-controls','representation-panel');
  button.addEventListener('click',()=>{tab=key;renderExplorer(text,lang,analyzed,pick);document.getElementById(`view-${key}`)?.focus();});
  button.addEventListener('keydown', event=>{
   const keys=Object.keys(names) as (keyof typeof names)[];let next=keys.indexOf(key);
   if(event.key==='ArrowRight')next=(next+1)%keys.length;else if(event.key==='ArrowLeft')next=(next-1+keys.length)%keys.length;else return;
   event.preventDefault();tab=keys[next];renderExplorer(text,lang,analyzed,pick);document.getElementById(`view-${tab}`)?.focus();
  });tabs.append(button);
 }host.append(tabs);
 const panel=el('div','','representation-panel');panel.id='representation-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',`view-${tab}`);
 const outputs=representations(c,concepts);
 const follow = (id:string) => {
  const target=concepts.find(c=>c.id===id);
  const button=el('button',target?.labels[lang]??id,'linked-concept');button.type='button';
  button.addEventListener('click',()=>{selected=id;if(target && domain!=='all' && target.domain!==domain)domain=target.domain;renderExplorer(text,lang,analyzed,pick);});return button;
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
  const graph=el('div','','semantic-graph');graph.append(el('strong',c.labels[lang]));
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
  for(const kind of ['entity','action','attribute','relationship','individual'] as const){
   const section=el('section');section.append(el('h3',t.kinds[kind]));
   concepts.filter(n=>(n.kind??'entity')===kind).forEach(n=>section.append(follow(n.id)));tree.append(section);
  }
  panel.append(tree,el('h3',c.labels[lang]));
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
 panel.append(download);host.append(panel);
 document.getElementById('synthetic-title')!.textContent=t.synthetic;
 document.getElementById('synthetic-hint')!.textContent=t.syntheticHint;
}
