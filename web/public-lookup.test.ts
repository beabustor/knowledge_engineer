import {test} from 'node:test';import assert from 'node:assert/strict';
import {reserve,normalizeResults,lookupUrl} from './public-lookup.ts';
test('browser quotas and expired timestamps',()=>{
 const now=100000000;assert.throws(()=>reserve(Array(6).fill(now),now));assert.throws(()=>reserve(Array.from({length:30},(_,i)=>now-100000-i),now));
 assert.equal(reserve([now-86400001],now).length,1);assert.throws(()=>lookupUrl('ols','x'));
});
test('public responses retain source identifiers, not invented ICD equivalence',()=>{
 const result=normalizeResults('ols',{response:{docs:[{label:'Cough',short_form:'HP:0012735',iri:'http://purl.obolibrary.org/obo/HP_0012735',ontology_name:'hp'}]}});
 assert.equal(result[0].status,'remote');assert.equal(result[0].code,'HP:0012735');
 assert.equal(normalizeResults('cima',{resultados:[{nombre:'Example medicine',nregistro:'12345'}]})[0].code,'12345');
 assert.equal(normalizeResults('ols',{response:{docs:[{label:'Bad',short_form:'x',iri:'javascript:bad'}]}}).length,0);
});
test('dedicated adapters constrain ontologies, languages and ICD edition',()=>{
 assert.equal(new URL(lookupUrl('chebi','water')).searchParams.get('ontology'),'chebi');
 assert.equal(new URL(lookupUrl('hpo','cough')).searchParams.get('ontology'),'hp');
 assert.equal(new URL(lookupUrl('wikidata','agua','es')).searchParams.get('language'),'es');
 const wikidata=normalizeResults('wikidata',{search:[{id:'Q283',label:'agua',description:'compuesto',display:{label:{language:'es'}}}]},'es')[0];
 assert.equal(wikidata.code,'Q283');assert.equal(wikidata.labelLanguage,'es');assert.match(wikidata.sourceLicense!,/CC0/);
 assert.equal(normalizeResults('wikidata',{search:[{id:'javascript:x',label:'bad'}]}).length,0);
 const icd=normalizeResults('icd10',[1,['R50.9'],null,[['R50.9','Fever, unspecified']]])[0];
 assert.match(icd.version,/US edition/);assert.equal(icd.labelLanguage,'en');assert.equal(icd.code,'R50.9');
 assert.throws(()=>normalizeResults('icd10',{}));
});
test('dedicated ontology connectors reject cross-ontology results',()=>{
 const docs=[{label:'water',obo_id:'CHEBI:15377',iri:'http://purl.obolibrary.org/obo/CHEBI_15377'}];
 assert.equal(normalizeResults('hpo',{response:{docs}}).length,0);
 assert.equal(normalizeResults('chebi',{response:{docs}}).length,1);
});
