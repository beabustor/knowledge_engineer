import { temperatures, isNegated } from '../typescript/clinical-language.ts';
import type { Concept } from './model.ts';
export function reportedConcepts(text: string): Concept[] {
 const values=temperatures(text).filter(t=>!t.negated);
 const normalized=text.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
 const ages=[...normalized.matchAll(/\b(\d{1,3})\s*(?:anos|years old)\b/gu)].filter(m=>Number(m[1])<=130&&!isNegated(normalized,m.index));
 if(!values.length&&!ages.length)return [];
 const common={domain:'modeling',source:'User-reported text / Texto del usuario',version:'session',url:'https://github.com/beabustor/knowledge_engineer',status:'reported',aliases:{en:[],es:[]}};
 const observations:Concept[] = values.length ? [
 {...common,id:'ReportedTemperature',kind:'entity',labels:{en:'Reported temperature',es:'Temperatura referida'}},
 {...common,id:'reportedValue',kind:'attribute',labels:{en:'Reported value',es:'Valor referido'},domainId:'ReportedTemperature',rangeId:'decimal'},
 {...common,id:'reportedUnit',kind:'attribute',labels:{en:'Reported unit',es:'Unidad referida'},domainId:'ReportedTemperature',rangeId:'string'},
 ...values.map((t,i)=>({...common,id:'TextTemperature'+i,kind:'individual',labels:{en:`Reported temperature: ${t.value} ${t.unit==='unspecified'?'(unit unspecified)':t.unit}`,es:`Temperatura referida: ${t.value} ${t.unit==='unspecified'?'(unidad no especificada)':t.unit}`},classId:'ReportedTemperature',properties:[{property:'reportedValue',value:t.value},{property:'reportedUnit',value:t.unit}]}))
 ] : [];
 if(ages.length){
  observations.push({...common,id:'ReportedAge',kind:'entity',labels:{en:'Reported age',es:'Edad referida'}},
   {...common,id:'reportedAgeValue',kind:'attribute',labels:{en:'Reported age in years',es:'Edad referida en años'},domainId:'ReportedAge',rangeId:'integer'});
  ages.forEach((m,i)=>observations.push({...common,id:'TextAge'+i,kind:'individual',labels:{en:`Reported age: ${m[1]} years`,es:`Edad referida: ${m[1]} años`},classId:'ReportedAge',properties:[{property:'reportedAgeValue',value:Number(m[1])}]}));
 }
 return observations;
}
