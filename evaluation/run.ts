import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {matchConcepts} from '../explorer/model.ts';
const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url),'utf8')).concepts;
const input=readFileSync(new URL('./cases.jsonl',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('./manifest.json',import.meta.url),'utf8'));
const hash=createHash('sha256').update(input).digest('hex');if(hash!==manifest.sha256)throw new Error('Frozen benchmark checksum mismatch');
const cases=input.trim().split('\n').map(line=>JSON.parse(line)).filter(c=>c.split==='test');
let tp=0,fp=0,fn=0,exact=0,correctNeg=0,negTotal=0,retrieved=0,goldTotal=0,abstentionCorrect=0,abstentionTotal=0;
const details=[];const timings:number[]=[];
for(const c of cases){
 const start=performance.now();const result=matchConcepts(c.text,catalog);timings.push(performance.now()-start);
 const predicted=new Set(result.flatMap(r=>[...new Set(r.evidence.map(e=>`${r.concept.id}|${e.negated?'negative':'positive'}`))]));
 const gold=new Set<string>([...c.positive.map((id:string)=>id+'|positive'),...c.negative.map((id:string)=>id+'|negative')]);
 for(const p of predicted)gold.has(p)?tp++:fp++;for(const g of gold)if(!predicted.has(g))fn++;
 const passed=predicted.size===gold.size&&[...gold].every(x=>predicted.has(x));if(passed)exact++;
 for(const id of [...c.positive,...c.negative]){const hit=result.find(r=>r.concept.id===id);if(hit){negTotal++;const states=new Set(hit.evidence.map(e=>e.negated));if(states.size===1&&states.has(c.negative.includes(id)))correctNeg++;}}
 const ids=new Set(result.slice(0,5).map(r=>r.concept.id));for(const id of [...c.positive,...c.negative]){goldTotal++;if(ids.has(id))retrieved++;}
 if(!gold.size){abstentionTotal++;if(!predicted.size)abstentionCorrect++;}
 details.push({id:c.id,text:c.text,tags:c.tags,expected:[...gold].sort(),actual:[...predicted].sort(),passed});
}
timings.sort((a,b)=>a-b);const precision=tp/(tp+fp||1),recall=tp/(tp+fn||1);
const report={dataset:manifest.dataset,review_status:manifest.independent_review,clinical_validation:false,test_cases:cases.length,dataset_sha256:hash,catalog_sha256:createHash('sha256').update(JSON.stringify(catalog)).digest('hex'),metrics:{micro_precision:precision,micro_recall:recall,micro_f1:2*precision*recall/(precision+recall||1),exact_case_accuracy:exact/cases.length,candidate_recall_at_5:retrieved/(goldTotal||1),negation_accuracy_on_retrieved_mentions:correctNeg/(negTotal||1),abstention_accuracy:abstentionCorrect/(abstentionTotal||1)},counts:{tp,fp,fn,exact_cases:exact,negation_scored:negTotal,abstention_cases:abstentionTotal},timing:{runtime:process.version,p50_ms:timings[Math.floor(timings.length*.5)],p95_ms:timings[Math.floor(timings.length*.95)],note:'Single local run; not a production latency SLA.'},cases:details};
writeFileSync(new URL('./report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({test_cases:cases.length,metrics:report.metrics,counts:report.counts},null,2));
