import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {conceptsFromRows,readCatalogFile} from './import-catalog.ts';
import {matchConcepts} from '../explorer/model.ts';
import {parseCsv} from '../explorer/csv.ts';
const base=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url),'utf8')).concepts;
const rows=[['COD_3','DESCRIPTION','COD_4','DESCRIPTION'],['R50','Fiebre','R509','Fiebre no especificada'],['R53','Malestar y fatiga','','']];
test('XLS actual source column structure and code normalization',async()=>{
 const XLSX=await import('@e965/xlsx');const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),'CIE10');
 const bytes=XLSX.write(book,{type:'array',bookType:'biff8'});
 const catalog=await readCatalogFile(bytes,'test.xls',base,'https://example.org');
 assert.equal(catalog.length,3);assert.equal(catalog.find(c=>c.code==='R50.9')?.parent,'Imported_R50');
 const results=matchConcepts('fiebre de 38 grados y me encuentro sin fuerzas',catalog);
 assert.ok(results.some(r=>r.concept.code==='R50.9'));assert.equal(results.find(r=>r.concept.code==='R53')?.evidence[0].negated,false);
});
test('quoted CSV and malformed/oversize input',()=>{
 const parsed=parseCsv('code,description\r\nR53,"Malestar, fatiga"');assert.equal(parsed[1][1],'Malestar, fatiga');
 assert.equal(conceptsFromRows(parsed,base,'https://example.org').length,1);
 assert.throws(()=>conceptsFromRows([['bad']],base,''));assert.throws(()=>parseCsv('code,"unfinished'));
});
test('unverified third-party workbook is not redistributed in current tree',async()=>{
 const {existsSync}=await import('node:fs');
 assert.equal(existsSync(new URL('../data/sources/cie10/cie10.xls',import.meta.url)),false);
});
