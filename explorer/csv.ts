/** RFC4180-style quoted fields, comma/semicolon delimiters and UTF-8 BOM. */
export function parseCsv(text:string):string[][] {
 if(text.length>8_000_000)throw new Error('CSV exceeds 8 MB / CSV supera 8 MB');
 text=text.replace(/^\uFEFF/,'');
 const first=text.split(/\r?\n/,1)[0];const delimiter=first.includes(';')&&!first.includes(',')?';':',';
 const rows:string[][]=[];let row:string[]=[];let field='';let quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){
   if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;
  }else if(c===delimiter&&!quoted){row.push(field);field='';}
  else if((c==='\n'||c==='\r')&&!quoted){
   if(c==='\r'&&text[i+1]==='\n')i++;
   row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';
  }else field+=c;
 }
 if(quoted)throw new Error('Unclosed CSV quote / Comillas CSV sin cerrar');
 row.push(field);if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
