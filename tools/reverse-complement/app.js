import {transformSequence} from './src/core.js?v=10';
import {downloadText} from '../_shared/js/download.js?v=9';
const $=id=>document.getElementById(id);let output='';
function run(){try{const result=transformSequence($('sequence').value,{rna:$('alphabet').value==='rna'}),mode=$('operation').value;output=result.records.map(r=>`>${r.name}|${mode}|length=${r.length}|GC=${r.gc.toFixed(2)}%\n${r[mode]}`).join('\n');$('output').value=output;$('status').textContent=`${result.records.length} record(s) processed locally.`}catch(e){$('status').textContent=e.message;$('output').value='';output=''}}
$('run').addEventListener('click',run);$('example').addEventListener('click',()=>{$('sequence').value='>example_DNA\nATGCRYSWKMBDHVN';run()});$('download').addEventListener('click',()=>output&&downloadText('transformed-sequences.fasta',output+'\n','text/plain'));if(new URLSearchParams(location.search).get('example')==='1')$('example').click();
