/** Anonymous public terminology lookup. No personal description is sent automatically. */
import type {Concept} from '../explorer/model.ts';
export type Source='ols'|'cima';
export const LIMIT_MINUTE=6, LIMIT_DAY=30;
const key='knowledge-public-lookups-v1';
let pending=false;
let fallback:number[]=[];
const cache=new Map<string,Concept[]>();
export function reserve(times:number[],now:number){
 const recent=times.filter(t=>Number.isFinite(t)&&t<=now&&t>now-86400000);
 if(recent.filter(t=>t>now-60000).length>=LIMIT_MINUTE||recent.length>=LIMIT_DAY)
  throw new Error('Limit reached: 6 requests/minute, 30/24h / Límite: 6 peticiones/minuto, 30/24 h');
 return [...recent,now];
}
export function lookupUrl(source:Source,term:string){
 if(term.trim().length<2||term.length>80)throw new Error('Use 2–80 characters / Usa 2–80 caracteres');
 return source==='ols'?`https://www.ebi.ac.uk/ols4/api/search?${new URLSearchParams({q:term,rows:'5'})}`:
 `https://cima.aemps.es/cima/rest/medicamentos?${new URLSearchParams({nombre:term})}`;
}
export function normalizeResults(source:Source,data:unknown):Concept[]{
 const body=data as {response?:{docs?:Record<string,unknown>[]};resultados?:Record<string,unknown>[]};
 const rows=source==='ols'?body?.response?.docs:body?.resultados;
 if(!Array.isArray(rows))throw new Error('Unexpected source response / Respuesta no reconocida');
 return rows.slice(0,5).flatMap((row,i)=>{
  const label=String(source==='ols'?row.label??'':row.nombre??'').slice(0,300);
  const code=String(source==='ols'?row.short_form??row.obo_id??'':row.nregistro??'').slice(0,100);
  const iri=source==='ols'?String(row.iri??''):`https://cima.aemps.es/cima/dochtml/ft/${encodeURIComponent(code)}/FT.html`;
  if(!label||!code||!/^https?:\/\//.test(iri))return [];
  return [{id:`Remote_${source}_${code.replace(/[^a-zA-Z0-9_]/g,'_')}_${i}`,domain:source==='cima'?'medication':'biomedical',labels:{en:label,es:label},aliases:{en:[],es:[]},code,source:source==='ols'?`OLS · ${String(row.ontology_name??'').slice(0,80)}`:'CIMA · AEMPS',version:'Live query / Consulta en vivo; source release not pinned / versión sin fijar',url:iri,status:'remote'}];
 });
}
export async function lookup(source:Source,term:string){
 term=term.trim();const url=lookupUrl(source,term);const cacheKey=source+':'+term.toLowerCase();
 if(cache.has(cacheKey))return {concepts:cache.get(cacheKey)!,cached:true};
 if(pending)throw new Error('One request at a time / Una petición a la vez');
 let history=fallback;
 try {const saved=JSON.parse(localStorage.getItem(key)??'[]');if(Array.isArray(saved))history=saved.filter(t=>typeof t==='number');}catch{/* Storage disabled: current tab only. */}
 fallback=reserve(history,Date.now());
 try{localStorage.setItem(key,JSON.stringify(fallback));}catch{/* No fingerprinting or IP collection. */}
 pending=true;
 try{
  const proxyBase=import.meta.env.VITE_LOOKUP_API_BASE as string|undefined;
  let endpoint=url;
  if(proxyBase){
   const base=new URL(proxyBase);
   if(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname)))throw new Error('HTTPS proxy required');
   endpoint=proxyBase.replace(/\/$/,'')+'/lookup?'+new URLSearchParams({source,term});
  }
  const response=await fetch(endpoint,{signal:AbortSignal.timeout(12000),credentials:'omit'});
  if(!response.ok)throw new Error(`Source HTTP ${response.status}`);
  const concepts=normalizeResults(source,await response.json());
  if(cache.size>=50)cache.delete(cache.keys().next().value!);
  cache.set(cacheKey,concepts);return {concepts,cached:false};
 }finally{pending=false;}
}
