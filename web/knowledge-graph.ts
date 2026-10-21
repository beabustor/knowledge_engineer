import {displayLabel,matchConcepts,type Concept,type Language} from '../explorer/model.ts';
type Node={id:string;label:string;x:number;y:number;kind:string;target?:string};
type Edge={a:string;b:string;label:string};
let zoom=1;
let previousQuery='';
export function renderKnowledgeGraph(concepts:Concept[],lang:Language,selected:string,onSelect:(id:string)=>void,activeIds:string[]=[],query=''){
 const host=document.getElementById('primary-graph')!;host.replaceChildren();
 if(query!==previousQuery){previousQuery=query;zoom=1;}
 const words=lang==='es'?{title:'Grafo de tu descripción',intro:'Cuadros, flechas y relaciones generados con los conceptos reconocidos en esta consulta.',reset:'Restablecer',up:'Acercar',down:'Alejar',note:'Solo conceptos de esta búsqueda y sus relaciones. Las menciones negadas y las asociaciones externas candidatas no afirman hechos clínicos.'}:{title:'Graph of your description',intro:'Boxes, arrows and relationships generated from concepts recognized in this query.',reset:'Reset',up:'Zoom in',down:'Zoom out',note:'Only concepts from this search and their relationships. Negated mentions and external candidate associations do not assert clinical facts.'};
 const title=document.createElement('h2');title.textContent=words.title;host.append(title);
 const intro=document.createElement('p');intro.className='hint';intro.textContent=words.intro;host.append(intro);
 const active=concepts.filter(c=>activeIds.includes(c.id));
 if(!query.trim()||!active.length){
  const empty=document.createElement('p');empty.className='hint';empty.textContent=!query.trim()?(lang==='es'?'Escribe una descripción para generar su grafo.':'Enter a description to generate its graph.'):(lang==='es'?'Sin conceptos reconocidos en la consulta actual.':'No recognized concepts in the current query.');host.append(empty);return;
 }
 const nodes:Node[]=[];const edges:Edge[]=[];
 const add=(id:string,label:string,x:number,y:number,kind='concept',target?:string)=>{if(!nodes.some(n=>n.id===id))nodes.push({id,label,x,y,kind,target});};
 const edge=(a:string,b:string,label:string)=>edges.push({a,b,label});
 const shown=active.slice(0,8);const rowHeight=240;
 add('query',query,10,Math.max(30,(shown.length*rowHeight)/2-32),'term');
 shown.forEach((c,i)=>{
  const y=30+i*rowHeight;
  const evidence=matchConcepts(query,[c])[0]?.evidence??[];
  const term=evidence.map(e=>e.term).join(' / ')||displayLabel(c,lang);
  const negated=evidence.length>0&&evidence.every(e=>e.negated);
  add('mention_'+c.id,term,250,y,'term',c.id);
  add(c.id,displayLabel(c,lang),510,y,negated?'negated':c.status,c.id);
  edge('query','mention_'+c.id,negated?'negatedMention':'mentions');edge('mention_'+c.id,c.id,'denotes');
  if(c.code){add('code_'+c.id,c.code,800,y,'code',c.id);edge(c.id,'code_'+c.id,'sourceCode');}
  const parent=concepts.find(n=>n.id===(c.classId??c.parent));
  if(parent){add(parent.id,displayLabel(parent,lang),1070,y+85,'class',parent.id);edge(c.id,parent.id,c.classId?'instanceOf':'isA');}
  if(c.formula){add('formula_'+c.id,c.formula,1070,y,'attribute',c.id);edge(c.id,'formula_'+c.id,'formula');}
  for(const [j,p] of (c.properties??[]).entries()){
   if(p.target){const target=concepts.find(n=>n.id===p.target);if(!target)continue;add(target.id,displayLabel(target,lang),800,y+85+j*75,target.status,target.id);edge(c.id,target.id,p.property==='candidateMatch'?'candidateMatch?':p.property);}
   else {const id='value_'+c.id+p.property;add(id,String(p.value),800,y+85+j*75,'attribute',p.property);edge(c.id,id,p.property);}
  }
 });
 const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');const height=Math.max(650,...nodes.map(n=>n.y+100));
 svg.setAttribute('viewBox',`0 0 1350 ${height}`);svg.setAttribute('class','knowledge-svg');svg.setAttribute('role','img');svg.setAttribute('aria-label',words.title);
 const defs=document.createElementNS(ns,'defs');const marker=document.createElementNS(ns,'marker');marker.id='kg-arrow';marker.setAttribute('viewBox','0 0 10 10');marker.setAttribute('refX','9');marker.setAttribute('refY','5');marker.setAttribute('markerWidth','7');marker.setAttribute('markerHeight','7');marker.setAttribute('orient','auto-start-reverse');const arrow=document.createElementNS(ns,'path');arrow.setAttribute('d','M 0 0 L 10 5 L 0 10 z');arrow.setAttribute('fill','#7ca994');marker.append(arrow);defs.append(marker);svg.append(defs);
 const group=document.createElementNS(ns,'g');group.setAttribute('transform',`translate(${675*(1-zoom)} ${height/2*(1-zoom)}) scale(${zoom})`);svg.append(group);
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
 const controls=document.createElement('div');controls.className='examples';for(const [label,value]of[[words.down,Math.max(.6,zoom-.2)],[words.reset,1],[words.up,Math.min(2,zoom+.2)]] as const){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{zoom=value;renderKnowledgeGraph(concepts,lang,selected,onSelect,activeIds,query);};controls.append(b);}host.append(controls);
 const note=document.createElement('p');note.className='hint';note.textContent=words.note;host.append(note);
}
