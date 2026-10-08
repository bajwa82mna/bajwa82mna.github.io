import {catalogue} from './_shared/js/catalogue.js';

export const CATEGORY_IDS=['journals-publishing','plant-sequence','statistics-figures','genomics'];
export const normalizeQuery=value=>String(value??'').trim().slice(0,80);
export const normalizeCategory=value=>CATEGORY_IDS.includes(value)?value:'all';
export function filterTools(tools,query='',category='all'){
  const words=normalizeQuery(query).toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return tools.filter(tool=>(normalizeCategory(category)==='all'||tool.categories.includes(category))&&words.every(word=>[tool.title,tool.promise,...tool.keywords].join(' ').toLocaleLowerCase().includes(word)));
}
export function normalizePins(value,tools=catalogue){
  if(!Array.isArray(value))return[];
  const selected=new Set(value.filter(item=>typeof item==='string'));
  return tools.map(tool=>tool.slug).filter(slug=>selected.has(slug));
}
const STORAGE_KEY='smbajwa.tools.pins';
function readPins(){try{return normalizePins(JSON.parse(localStorage.getItem(STORAGE_KEY)),catalogue)}catch{return[]}}
function writePins(pins){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(pins))}catch{/* Storage can be disabled. */}}
function init(){
  const search=document.querySelector('[data-tool-search]');
  const cards=new Map([...document.querySelectorAll('[data-tool]')].map(card=>[card.dataset.tool,card]));
  const buttons=[...document.querySelectorAll('[data-category]')];
  const count=document.querySelector('[data-result-count]');
  const empty=document.querySelector('[data-empty-state]');
  const pinnedSection=document.querySelector('[data-pinned-section]');
  const pinnedList=document.querySelector('[data-pinned-list]');
  const params=new URLSearchParams(location.search);
  let query=normalizeQuery(params.get('q')),category=normalizeCategory(params.get('cat')),pins=readPins();
  search.value=query;
  function updateUrl(){const next=new URLSearchParams();if(query)next.set('q',query);if(category!=='all')next.set('cat',category);history.replaceState(null,'',`${location.pathname}${next.size?`?${next}`:''}`)}
  function renderPins(){
    pinnedList.replaceChildren();
    for(const slug of pins){const tool=catalogue.find(item=>item.slug===slug);const link=document.createElement('a');link.href=tool.href;link.textContent=tool.title;pinnedList.append(link)}
    pinnedSection.hidden=pins.length===0;
    for(const [slug,card] of cards){const button=card.querySelector('[data-pin]');const pinned=pins.includes(slug);button.setAttribute('aria-pressed',String(pinned));button.textContent=pinned?'Pinned':'Pin'}
  }
  function render(){const visible=filterTools(catalogue,query,category),slugs=new Set(visible.map(tool=>tool.slug));for(const [slug,card] of cards)card.hidden=!slugs.has(slug);count.textContent=`${visible.length} of ${catalogue.length} tools`;empty.hidden=visible.length!==0;for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.category===category));updateUrl()}
  search.addEventListener('input',()=>{query=normalizeQuery(search.value);render()});
  search.form.addEventListener('submit',event=>event.preventDefault());
  for(const button of buttons)button.addEventListener('click',()=>{category=normalizeCategory(button.dataset.category);render()});
  for(const [slug,card] of cards)card.querySelector('[data-pin]').addEventListener('click',()=>{pins=pins.includes(slug)?pins.filter(item=>item!==slug):normalizePins([...pins,slug],catalogue);writePins(pins);renderPins()});
  renderPins();render();
}
if(typeof document!=='undefined')init();
