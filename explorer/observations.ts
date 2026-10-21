import { temperatures } from '../typescript/clinical-language.ts';
import type { Concept } from './model.ts';
export function reportedConcepts(text: string): Concept[] {
 const values=temperatures(text).filter(t=>!t.negated);
 if(!values.length)return [];
 const common={domain:'modeling',source:'User-reported text / Texto del usuario',version:'session',url:'https://github.com/beabustor/knowledge_engineer',status:'reported',aliases:{en:[],es:[]}};
 return [
 {...common,id:'ReportedTemperature',kind:'entity',labels:{en:'Reported temperature',es:'Temperatura referida'}},
 {...common,id:'reportedValue',kind:'attribute',labels:{en:'Reported value',es:'Valor referido'},domainId:'ReportedTemperature',rangeId:'decimal'},
 {...common,id:'reportedUnit',kind:'attribute',labels:{en:'Reported unit',es:'Unidad referida'},domainId:'ReportedTemperature',rangeId:'string'},
 ...values.map((t,i)=>({...common,id:'TextTemperature'+i,kind:'individual',labels:{en:`Reported temperature: ${t.value} ${t.unit==='unspecified'?'(unit unspecified)':t.unit}`,es:`Temperatura referida: ${t.value} ${t.unit==='unspecified'?'(unidad no especificada)':t.unit}`},classId:'ReportedTemperature',properties:[{property:'reportedValue',value:t.value},{property:'reportedUnit',value:t.unit}]}))
 ];
}
