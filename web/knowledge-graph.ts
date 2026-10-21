import en from '../locales/en.json';
import es from '../locales/es.json';
import {displayLabel, type Concept, type Language} from '../explorer/model.ts';
type Node={id:string;label:string;x:number;y:number;kind:string;target?:string};
type Edge={a:string;b:string;label:string};
let mode='lexical';let zoom=1;
export function renderKnowledgeGraph(concepts:Concept[],lang:Language,selected:string,onSelect:(id:string)=>void){
 const host=document.getElementById('primary-graph')!;host.replaceChildren();
 const words=lang==='es'?{title:'El conocimiento, conectado',intro:'Selecciona un nodo para inspeccionar sus representaciones. Las flechas indican el tipo de relación.',lexical:'Lenguaje y sentidos',clinical:'Hallazgos y códigos',chemical:'Química',modeling:'Entidades, atributos y acciones',reset:'Restablecer',up:'Acercar',down:'Alejar',note:'Datos de ejemplo y relaciones locales. Las conexiones externas son candidatas, no equivalencias verificadas.'}:{title:'Knowledge, connected',intro:'Select a node to inspect its representations. Arrows identify each relationship.',lexical:'Language and senses',clinical:'Findings and codes',chemical:'Chemistry',modeling:'Entities, attributes and actions',reset:'Reset',up:'Zoom in',down:'Zoom out',note:'Example data and local relationships. External connections are candidates, not verified equivalences.'};
 const title=document.createElement('h2');title.textContent=words.title;host.append(title);
 const intro=document.createElement('p');intro.textContent=words.intro;intro.className='hint';host.append(intro);
 const toolbar=document.createElement('div');toolbar.className='representation-tabs';
 for(const key of ['lexical','clinical','chemical','modeling'] as const){const b=document.createElement('button');b.type='button';b.textContent=words[key];b.setAttribute('aria-pressed',String(mode===key));b.onclick=()=>{mode=key;zoom=1;renderKnowledgeGraph(concepts,lang,selected,onSelect);};toolbar.append(b);}host.append(toolbar);
 const nodes:Node[]=[];const edges:Edge[]=[];
 const labels=(lang==='es'?es:en).labels as Record<string,string>;
 const add=(id:string,label:string,x:number,y:number,kind='concept',target?:string)=>{if(!nodes.some(n=>n.id===id))nodes.push({id,label,x,y,kind,target});};
 const edge=(a:string,b:string,label:string)=>edges.push({a,b,label});
 if(mode==='lexical'){
  add('term_headache','headache',15,30,'term','Headache');add('term_cefalea','cefalea',15,130,'term','Headache');add('Migraine',labels.ExampleMigraine,15,230,'synthetic','ExampleMigraine');
  add('Headache',labels.headache,300,130,'concept','Headache');
  edge('term_headache','Headache','denotes');edge('term_cefalea','Headache','denotes');edge('Migraine','Headache','hasSymptom');
  add('term_cold','cold / frío',15,420,'term','ColdSensation');add('ColdWeather',labels.ColdWeather,300,330,'concept','ColdWeather');add('ColdSensation',labels.ColdSensation,300,430,'concept','ColdSensation');
  add('Cold',labels.ExampleCold,300,530,'synthetic','ExampleCold');add('Respiratory',labels.RespiratoryDisease,600,530,'concept','RespiratoryDisease');add('Disease',labels.Disease,900,530,'concept','Disease');
  for(const id of ['ColdWeather','ColdSensation','Cold'])edge('term_cold',id,'denotes');edge('Cold','Respiratory','isA');edge('Respiratory','Disease','isA');
 }else{
  const selectedConcept=concepts.find(c=>c.id===selected);
  let chosen:Concept[]=[];
  if(mode==='clinical'){
   const hits=concepts.filter(c=>c.domain==='clinical'&&(c.id===selected||['R05','R50.9','R53'].includes(c.code??'')||c.id==='PurpleSkinSpots'));
   chosen=hits.slice(0,6);
  }else if(mode==='chemical')chosen=concepts.filter(c=>c.domain==='chemical'&&c.code).slice(0,4);
  else chosen=concepts.filter(c=>['SampleMeasurement','SamplePerson','SampleClinician'].includes(c.id));
  if(selectedConcept?.status==='remote'&&!chosen.includes(selectedConcept))chosen.push(selectedConcept);
  chosen.forEach((c,i)=>{
   const y=30+i*90;
   add(c.id,displayLabel(c,lang),320,y,c.status,c.id);
   const alias=c.aliases[lang][0]??displayLabel(c,lang);add('term_'+c.id,alias,15,y,'term',c.id);edge('term_'+c.id,c.id,'denotes');
   if(c.code){add('code_'+c.id,c.code,625,y,'code',c.id);edge(c.id,'code_'+c.id,'sourceCode');}
   if(c.formula){add('formula_'+c.id,c.formula,930,y,'attribute',c.id);edge(c.id,'formula_'+c.id,'formula');}
   if(c.classId){const cls=concepts.find(x=>x.id===c.classId);add(c.classId,cls?.labels[lang]??c.classId,930,y,'class',c.classId);edge(c.id,c.classId,'instanceOf');}
  });
  if(mode==='modeling'){
   for(const c of chosen)for(const p of c.properties??[]){
    if(p.target&&nodes.some(n=>n.id===p.target))edge(c.id,p.target,p.property);
    else if(p.value!==undefined){const id='value_'+c.id+p.property;add(id,String(p.value),625,c.id==='SamplePerson'?390:300,'attribute',p.property);edge(c.id,id,p.property);}
   }
  }
 }
 let candidateRow=0;
 for(const c of concepts){
  for(const p of c.properties??[]){
   if(p.property!=='candidateMatch'||!p.target||candidateRow>=3)continue;
   const target=concepts.find(n=>n.id===p.target);if(!target)continue;
   add(c.id,displayLabel(c,lang),600,60+candidateRow*110,c.status,c.id);
   add(target.id,displayLabel(target,lang),930,60+candidateRow*110,'remote',target.id);
   edge(c.id,target.id,'candidateMatch?');candidateRow++;
  }
 }
 const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');const height=Math.max(650,...nodes.map(n=>n.y+100));
 svg.setAttribute('viewBox',`0 0 1120 ${height}`);svg.setAttribute('class','knowledge-svg');svg.setAttribute('role','img');svg.setAttribute('aria-label',words.title);
 const defs=document.createElementNS(ns,'defs');const marker=document.createElementNS(ns,'marker');marker.id='kg-arrow';marker.setAttribute('viewBox','0 0 10 10');marker.setAttribute('refX','9');marker.setAttribute('refY','5');marker.setAttribute('markerWidth','7');marker.setAttribute('markerHeight','7');marker.setAttribute('orient','auto-start-reverse');const arrow=document.createElementNS(ns,'path');arrow.setAttribute('d','M 0 0 L 10 5 L 0 10 z');arrow.setAttribute('fill','#7ca994');marker.append(arrow);defs.append(marker);svg.append(defs);
 const group=document.createElementNS(ns,'g');group.setAttribute('transform',`translate(${560*(1-zoom)} ${height/2*(1-zoom)}) scale(${zoom})`);svg.append(group);
 for(const e of edges){const a=nodes.find(n=>n.id===e.a),b=nodes.find(n=>n.id===e.b);if(!a||!b)continue;
  const path=document.createElementNS(ns,'path');const x1=a.x+175,y1=a.y+32,x2=b.x,y2=b.y+32;
  const backwards=x2<=x1;const control=backwards?80:Math.max(40,(x2-x1)/2);
  path.setAttribute('d',`M ${x1} ${y1} C ${x1+control} ${y1}, ${x2-control} ${y2}, ${x2} ${y2}`);path.setAttribute('class','kg-edge'+(e.label==='candidateMatch?'?' candidate-edge':''));path.setAttribute('marker-end','url(#kg-arrow)');group.append(path);
  const text=document.createElementNS(ns,'text');text.setAttribute('x',String((x1+x2)/2));text.setAttribute('y',String((y1+y2)/2-8));text.setAttribute('class','kg-edge-label');text.textContent=e.label;group.append(text);
 }
 for(const n of nodes){const g=document.createElementNS(ns,'g');g.setAttribute('transform',`translate(${n.x},${n.y})`);g.setAttribute('class','kg-node kind-'+n.kind+(n.target===selected?' kg-active':''));g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',n.label);
  const rect=document.createElementNS(ns,'rect');rect.setAttribute('width','175');rect.setAttribute('height','64');rect.setAttribute('rx','8');g.append(rect);
  const text=document.createElementNS(ns,'text');const split=n.label.match(/.{1,23}(?:\s|$)|.{1,23}/g)??[n.label];split.slice(0,3).forEach((line,i)=>{const span=document.createElementNS(ns,'tspan');span.setAttribute('x','87.5');span.setAttribute('y',String(24+i*16));span.textContent=line.trim();text.append(span);});g.append(text);
  const activate=()=>{if(n.target)onSelect(n.target);};g.addEventListener('click',activate);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});group.append(g);
 }
 const canvas=document.createElement('div');canvas.className='knowledge-canvas';canvas.append(svg);host.append(canvas);
 const controls=document.createElement('div');controls.className='examples';for(const [label,value]of[[words.down,Math.max(.6,zoom-.2)],[words.reset,1],[words.up,Math.min(2,zoom+.2)]] as const){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{zoom=value;renderKnowledgeGraph(concepts,lang,selected,onSelect);};controls.append(b);}host.append(controls);
 const note=document.createElement('p');note.className='hint';note.textContent=words.note;host.append(note);
}
