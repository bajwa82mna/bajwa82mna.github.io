import {numbers} from './src/validation.js?v=8';
import {ddCq} from './src/qpcr.js?v=8';
import {singleDilution,serialDilution} from './src/dilution.js?v=8';
import {molarityFromMass,massForMolarity} from './src/molarity.js?v=8';
import {wallace,nearestNeighbor} from './src/tm.js?v=8';
import {auditRecord,auditCsv,download} from './src/export.js?v=8';
import {sig} from './src/units.js?v=8';
import {safeTextElement} from '../_shared/js/dom.js?v=8';

const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
const node=(tag,value,className='')=>safeTextElement(document,tag,value,className);
let last=null;

function metric(label,value){const item=document.createElement('div');item.className='metric';item.append(node('b',value),node('span',label));return item}
function grid(...items){const result=document.createElement('div');result.className='result-grid';result.append(...items);return result}
function render(element,title,content,record){
  const actions=document.createElement('div');actions.className='actions';
  const exportButton=node('button','Download JSON record','export');exportButton.type='button';exportButton.dataset.export='';
  const printButton=node('button','Print methods record','export');printButton.type='button';
  exportButton.addEventListener('click',()=>download(`plant-lab-${record.calculator}-${Date.now()}.json`,JSON.stringify(record,null,2)));
  const csvButton=node('button','Download CSV','export');csvButton.type='button';csvButton.addEventListener('click',()=>download(`plant-lab-${record.calculator}-${Date.now()}.csv`,auditCsv(record),'text/csv'));
  printButton.addEventListener('click',()=>window.print());actions.append(exportButton,csvButton,printButton);
  element.replaceChildren(node('h3',title),...content,actions);last=record;
}
function fail(element,error){const message=document.createElement('p');message.className='error';message.append(node('b','Check the inputs: '),document.createTextNode(String(error?.message||error)));element.replaceChildren(message)}
function steps(value){return node('p',value,'steps')}
function warning(value){return value?node('p',value,'warning'):null}

const tabs=$$('.tabs [role="tab"]');
function activateTab(tab,{focus=false,hash=true}={}){
  tabs.forEach(item=>{const active=item===tab;item.classList.toggle('active',active);item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1});
  $$('.calculator').forEach(panel=>{const active=panel.id===tab.dataset.tab;panel.hidden=!active;panel.classList.toggle('active',active)});
  if(hash)location.hash=tab.dataset.tab;if(focus)tab.focus();
}
tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>activateTab(tab));
  tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();activateTab(tabs[next],{focus:true})});
});
if(location.hash&&$(location.hash))activateTab($(`[data-tab="${location.hash.slice(1)}"]`),{hash:false});

$('#qpcr form').addEventListener('submit',event=>{event.preventDefault();const form=new FormData(event.target),input={sampleTarget:numbers(form.get('sampleTarget')),sampleReference:numbers(form.get('sampleReference')),controlTarget:numbers(form.get('controlTarget')),controlReference:numbers(form.get('controlReference')),targetEfficiency:+form.get('targetEfficiency'),referenceEfficiency:+form.get('referenceEfficiency')};try{const result=ddCq(input),content=[grid(metric('Fold change',sig(result.fold,5)+'×'),metric('Sample ΔCq',sig(result.sampleDelta)),metric('Control ΔCq',sig(result.controlDelta)),metric('ΔΔCq',sig(result.deltaDelta))),steps(`Means are calculated within each replicate group. ${result.method}; fold = ${sig(result.targetEfficiency||input.targetEfficiency)}^(−${sig(result.deltaDelta)}) for equal efficiencies.`),...result.warnings.map(warning)];render($('#qpcr .result'),'Relative expression',content,auditRecord('qpcr',input,result))}catch(error){fail($('#qpcr .result'),error)}});

const dilutionForm=$('#dilution form');
dilutionForm.querySelectorAll('[name=mode]').forEach(input=>input.addEventListener('change',()=>{const serial=input.value==='serial'&&input.checked;dilutionForm.querySelector('.single-fields').hidden=serial;dilutionForm.querySelector('.serial-fields').hidden=!serial}));
dilutionForm.addEventListener('submit',event=>{event.preventDefault();const form=new FormData(event.target),mode=form.get('mode');try{if(mode==='single'){const input=Object.fromEntries(['stock','target','finalVolume','overagePercent','minPipette'].map(key=>[key,+form.get(key)])),result=singleDilution(input),content=[grid(metric('Stock volume',sig(result.stockVolume)),metric('Diluent volume',sig(result.diluentVolume)),metric('Total prepared',sig(result.prepared))),steps(`V₁ = C₂ × V₂ ÷ C₁ = ${sig(input.target)} × ${sig(result.prepared)} ÷ ${sig(input.stock)}.`)];if(result.warning)content.push(warning(result.warning));render($('#dilution .result'),'Single dilution',content,auditRecord('dilution-single',input,result))}else{const input=Object.fromEntries(['start','factor','steps','volumePerTube','overagePercent','minPipette'].map(key=>[key,+form.get(key)])),result=serialDilution(input),content=[steps(result.rows.map(row=>`Step ${row.step}: ${sig(row.concentration)} concentration; transfer ${sig(row.transfer)} into ${sig(row.diluent)} diluent.`).join('\n'))];if(result.warning)content.push(warning(result.warning));render($('#dilution .result'),`${result.rows.length}-step serial dilution`,content,auditRecord('dilution-serial',input,result))}}catch(error){fail($('#dilution .result'),error)}});

const molarityForm=$('#molarity form');
molarityForm.querySelectorAll('[name=mode]').forEach(input=>input.addEventListener('change',()=>{const toMass=input.value==='toMass'&&input.checked;molarityForm.querySelector('.mass-input').hidden=toMass;molarityForm.querySelector('.molarity-input').hidden=!toMass}));
molarityForm.addEventListener('submit',event=>{event.preventDefault();const form=new FormData(event.target),mode=form.get('mode'),keys=mode==='fromMass'?['mass','molecularWeight','volume','purityPercent','hydrateFactor']:['molarity','molecularWeight','volume','purityPercent','hydrateFactor'],input=Object.fromEntries(keys.map(key=>[key,+form.get(key)]));input.volumePrefix=form.get('volumePrefix');input.massPrefix=form.get('massPrefix');try{const result=mode==='fromMass'?molarityFromMass(input):massForMolarity(input);render($('#molarity .result'),'Solution calculation',[grid(mode==='fromMass'?metric('Molarity',sig(result.molarity,5)+' mol/L'):metric('Required mass',sig(result.grams,5)+' g'),metric('Amount',sig(result.moles,5)+' mol'),metric('Effective formula weight',sig(result.effectiveMolecularWeight,5)+' g/mol')),steps('Purity and hydrate corrections are applied explicitly; neither is inferred from a compound name.')],auditRecord('molarity',input,result))}catch(error){fail($('#molarity .result'),error)}});

$('#tm form').addEventListener('submit',event=>{event.preventDefault();const form=new FormData(event.target),input={sequence:form.get('sequence'),method:form.get('method'),sodiumMm:+form.get('sodiumMm'),primerNm:+form.get('primerNm'),selfComplementary:form.has('selfComplementary')};try{const result=input.method==='wallace'?wallace(input.sequence):nearestNeighbor(input.sequence,input),detail=input.method==='nn'?`ΔH ${sig(result.enthalpy)} kcal/mol; ΔS ${sig(result.entropy)} cal/(K·mol); Na⁺ ${input.sodiumMm} mM; primer ${input.primerNm} nM.`:'Wallace estimates are screening approximations.';render($('#tm .result'),'Primer Tm estimate',[grid(metric('Tm',sig(result.tm,5)+' °C'),metric('Length',result.length+' nt'),metric('GC content',sig(result.gcPercent,4)+'%'),metric('Method',result.method)),steps(`Sanitized sequence: ${result.sequence}. ${detail}`)],auditRecord('primer-tm',input,result))}catch(error){fail($('#tm .result'),error)}});

$('#clear').addEventListener('click',()=>{$$('form').forEach(form=>form.reset());$$('.result').forEach(result=>result.replaceChildren());last=null;try{localStorage.removeItem('plant-lab-calculators')}catch{}});
let urdu=false;$('#language').addEventListener('click',()=>{urdu=!urdu;document.documentElement.lang=urdu?'ur':'en';document.documentElement.dir=urdu?'rtl':'ltr';$('#language').textContent=urdu?'English':'اردو';$('#privacy').textContent=urdu?'یہاں درج کیا گیا تمام ڈیٹا اسی براؤزر ٹیب میں رہتا ہے۔ کسی حساب کے لیے نیٹ ورک درکار نہیں۔':'Everything entered here stays in this browser tab. No calculation requires a network request.'});
