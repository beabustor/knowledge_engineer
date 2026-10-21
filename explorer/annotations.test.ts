import {test} from 'node:test';import assert from 'node:assert/strict';
import {annotationConcepts,locateSpan,type Annotation} from './annotations.ts';
import {normalizeResults} from '../web/public-lookup.ts';
import {representations} from './model.ts';
test('review preserves negative evidence, source and status without asserting equivalence',()=>{
 const candidate=normalizeResults('hpo',{response:{docs:[{label:'Cough',obo_id:'HP:0012735',iri:'http://purl.obolibrary.org/obo/HP_0012735'}]}})[0];
 const a:Annotation={id:'Annotation_test',span:'tos',query:'Sin tos',candidate,review:'accepted',at:'2026-10-21T00:00:00Z'};
 const nodes=[candidate,...annotationConcepts('Sin tos',[a])];
 const out=representations(nodes.find(n=>n.id===a.id)!,nodes);
 assert.match(out.rdf,/"negated"/);assert.match(out.rdf,/"accepted"/);assert.match(out.rdf,/prov:wasDerivedFrom/);assert.match(out.rdf,/skos:prefLabel/);assert.match(out.rdf,/<http:\/\/purl.obolibrary.org/);
 assert.doesNotMatch(out.rdf,/owl:(sameAs|equivalentClass)/);
 a.review='rejected';const rejected=annotationConcepts('Sin tos',[a]);
 assert.equal(rejected.find(n=>n.id===a.id)!.properties!.some(p=>p.target),false);
 assert.ok(rejected.find(n=>n.id===a.id)!.properties!.some(p=>p.property==='sourceIRI'));
 assert.equal(annotationConcepts('Tengo fiebre',[a]).some(n=>n.id===a.id),false);
 assert.equal(locateSpan('Tengo costoso','tos'),null);
});
