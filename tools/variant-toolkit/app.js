import {summarizeVcf,MAX_BYTES} from './src/vcf.js?v=22';
import {predictConsequences} from './src/consequence.js?v=22';

const $=id=>document.getElementById(id);
const EXAMPLE_VCF='##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\nchr1\t10\t.\tA\tG\t.\tPASS\t.\nchr1\t8\t.\tG\tT\t.\tPASS\t.\nchr1\t7\t.\tG\tGA\t.\tPASS\t.\n';
const EXAMPLE_FASTA='>chr1\nAAAAATGGAACTGTAACCCGGGTTTAAA\n';
const EXAMPLE_GFF='##gff-version 3\nchr1\tlesson\tmRNA\t5\t19\t.\t+\t.\tID=tx1;Parent=g1\nchr1\tlesson\tCDS\t5\t10\t.\t+\t0\tParent=tx1\nchr1\tlesson\tCDS\t14\t19\t.\t+\t0\tParent=tx1\n';
function cell(row,value){const td=document.createElement('td');td.textContent=String(value);row.append(td)}
function showTab(name){
  document.querySelectorAll('[role="tab"]').forEach(b=>{const on=b.dataset.tab===name;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1});
  document.querySelectorAll('[role="tabpanel"]').forEach(p=>p.hidden=p.id!==`panel-${name}`);
  history.replaceState(null,'',`?tab=${name}`);
}
document.querySelector('[role="tablist"]').addEventListener('click',e=>{const b=e.target.closest('[role="tab"]');if(b)showTab(b.dataset.tab)});
document.querySelector('[role="tablist"]').addEventListener('keydown',e=>{const tabs=[...document.querySelectorAll('[role="tab"]')],i=tabs.indexOf(document.activeElement);let next;if(e.key==='Home')next=tabs[0];else if(e.key==='End')next=tabs.at(-1);else if(e.key==='ArrowRight')next=tabs[(i+1)%tabs.length];else if(e.key==='ArrowLeft')next=tabs[(i-1+tabs.length)%tabs.length];else return;e.preventDefault();next.focus();showTab(next.dataset.tab)});
async function loadFile(input,target,status){const file=input.files[0];if(!file)return;if(file.size>MAX_BYTES){status.textContent='File is larger than 2 MB.';return}target.value=await file.text();status.textContent=`Loaded ${file.name} locally (${file.size.toLocaleString()} bytes).`}
$('vcf-file').addEventListener('change',()=>loadFile($('vcf-file'),$('vcf'),$('vcf-status')));
$('check').addEventListener('click',()=>{
  try{const s=summarizeVcf($('vcf').value),body=$('summary-body');body.replaceChildren();for(const [label,value] of [['Records',s.records],['ALT alleles',s.alleles],['SNPs',s.snps],['Indels',s.indels],['Other substitutions',s.other],['Multiallelic sites',s.multiallelic],['Transitions',s.transitions],['Transversions',s.transversions],['Ts/Tv',s.tsTv===null?'Not defined':s.tsTv.toFixed(3)]]){const tr=document.createElement('tr');cell(tr,label);cell(tr,value);body.append(tr)}
    $('chromosomes').textContent=Object.entries(s.chromosomes).map(([c,n])=>`${c}: ${n}`).join(' · ')||'None';$('errors').textContent=s.malformed.length?s.malformed.map(x=>`Line ${x.line}: ${x.message}`).join('\n'):'No malformed records found by these checks.';$('vcf-status').textContent=s.valid?'Checks completed. No structural errors found.':'Checks completed with errors; see line report.';
  }catch(error){$('vcf-status').textContent=error.message}
});
$('vcf-example').addEventListener('click',()=>{$('vcf').value=EXAMPLE_VCF;$('check').click()});
for(const [input,target,status] of [['pred-vcf-file','pred-vcf','predict-status'],['gff-file','gff','predict-status'],['fasta-file','fasta','predict-status']])$(input).addEventListener('change',()=>loadFile($(input),$(target),$(status)));
$('predict').addEventListener('click',()=>{
  try{const results=predictConsequences({vcf:$('pred-vcf').value,gff:$('gff').value,fasta:$('fasta').value}),body=$('prediction-body');body.replaceChildren();for(const r of results){const tr=document.createElement('tr');for(const v of [r.chrom,r.pos,`${r.ref} → ${r.alt}`,r.transcript,r.consequence,r.spliceSite?'yes':'no'])cell(tr,v);body.append(tr)}$('predict-status').textContent=`Predicted ${results.length} variant–transcript consequence${results.length===1?'':'s'}. Experimental results require confirmation with a full annotator.`}catch(error){$('predict-status').textContent=error.message}
});
function loadExamples(){ $('vcf').value=EXAMPLE_VCF;$('pred-vcf').value=EXAMPLE_VCF;$('gff').value=EXAMPLE_GFF;$('fasta').value=EXAMPLE_FASTA }
$('predict-example').addEventListener('click',()=>{loadExamples();$('predict').click()});
const params=new URLSearchParams(location.search);if(params.get('example')==='1'){loadExamples();showTab('checker');$('check').click()}else showTab(['checker','predictor','guide'].includes(params.get('tab'))?params.get('tab'):'checker');
