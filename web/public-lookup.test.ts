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
