import {safeUrl} from './safe-link.js?v=19';
import {safeTextElement} from './dom.js?v=19';

const SITE_HOST='smbajwa.com';
const APPROVED_MODES=new Map([['/tools/journal-hub/',new Set(['check','apc','match','timing','trends'])],['/tools/publishing-toolkit/',new Set(['references','identifiers'])]]);
const APPROVED=new Map([
  ['/', ['Shoaib Munir, Plant Molecular Biology','Plant molecular biology research and free, open tools for students and researchers — smbajwa.com']],
  ['/tools/', ['Open research tools','Six free, open tools for students and researchers — smbajwa.com']],
  ['/privacy.html', ['Privacy Policy, Shoaib Munir','Privacy information for smbajwa.com and its browser-based research tools.']],
  ['/credits/', ['Credits and data sources','Credits, open-data sources and software licences for smbajwa.com research tools']],
  ['/tools/plant-lab-calculators/', ['Plant Lab Toolkit','Free, open tool for students and researchers: Plant Lab Toolkit — smbajwa.com']],
  ['/tools/descriptive-statistics/', ['Descriptive Statistics','Free, open tool for students and researchers: Descriptive Statistics — smbajwa.com']],
  ['/tools/journal-figure-resizer/', ['Journal Figure Resizer','Free, open tool for students and researchers: Journal Figure Resizer — smbajwa.com']],
  ['/tools/journal-hub/', ['Journal Hub','Free, open journal discovery and evidence tool — smbajwa.com']],
  ['/tools/publishing-toolkit/', ['Publishing Toolkit','Free, open reference and identifier toolkit — smbajwa.com']],
  ['/tools/variant-toolkit/', ['Variant Toolkit','Free browser-local VCF checks and plant variant learning tools — smbajwa.com']]
]);

export function validateShareData(input={}){
  let url;try{url=new URL(safeUrl(String(input.url||''))||'')}catch{throw new TypeError('Share URL must be an smbajwa.com HTTPS URL')}
  if(url.origin!==`https://${SITE_HOST}`||url.username||url.password||url.port||!APPROVED.has(url.pathname))throw new TypeError('Share URL must be an allow-listed smbajwa.com HTTPS URL');
  url.hash='';
  const journal=input.journal;
  if(url.pathname==='/tools/journal-hub/'&&url.searchParams.has('q')){
    const title=String(journal?.title||''),issns=Array.isArray(journal?.issns)?journal.issns.map(String):[];
    if(!title||url.searchParams.size!==1||url.searchParams.get('q')!==title||(!issns.length&&!title))throw new TypeError('Journal deep link must match a fixed dataset journal');
    const expectedTitle=`${title} — Journal Hub`,expectedText=`Journal profile: ${title} — Journal Hub, smbajwa.com`;
    if(input.title!==expectedTitle||input.text!==expectedText)throw new TypeError('Share title and text must be approved share copy');
  }else{
    const mode=url.searchParams.get('mode'),allowed=APPROVED_MODES.get(url.pathname);
    if(!allowed?.has(mode)||url.searchParams.size!==1)url.search='';
    const [title,text]=APPROVED.get(url.pathname);
    if(input.title!==title||input.text!==text)throw new TypeError('Share title and text must be approved share copy');
  }
  return url;
}

export function normalizeShareData(input={}){
  const url=validateShareData(input);
  return {url:url.href,title:String(input.title||'smbajwa.com'),text:String(input.text||''),citation:String(input.citation||''),summary:String(input.summary||''),journal:input.journal};
}

export function buildShareUrls(input){
  const {url,title,text}=normalizeShareData(input),u=encodeURIComponent(url),message=encodeURIComponent(`${text} ${url}`.trim());
  return {
    X:`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${u}`,
    LinkedIn:`https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    Facebook:`https://www.facebook.com/sharer/sharer.php?u=${u}`,
    WhatsApp:`https://wa.me/?text=${message}`,
    Telegram:`https://t.me/share/url?url=${u}&text=${encodeURIComponent(text)}`,
    Bluesky:`https://bsky.app/intent/compose?text=${message}`,
    Reddit:`https://www.reddit.com/submit?url=${u}&title=${encodeURIComponent(title)}`,
    Email:`mailto:?subject=${encodeURIComponent(title)}&body=${message}`
  };
}

export function createQrMatrix(value){
  const generator=globalThis.qrcode;
  if(typeof generator!=='function')throw new Error('QR generator unavailable');
  const qr=generator(0,'M'); qr.addData(String(value),'Byte'); qr.make();
  return Array.from({length:qr.getModuleCount()},(_,row)=>Array.from({length:qr.getModuleCount()},(_,col)=>qr.isDark(row,col)));
}

function button(label,action){const el=safeTextElement(document,'button',label);el.type='button';el.dataset.shareAction=action;return el}
function drawQr(canvas,url){
  const matrix=createQrMatrix(url),quiet=4,size=6,total=(matrix.length+quiet*2)*size;
  canvas.width=canvas.height=total;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,total,total);ctx.fillStyle='#111';
  matrix.forEach((row,y)=>row.forEach((dark,x)=>{if(dark)ctx.fillRect((x+quiet)*size,(y+quiet)*size,size,size)}));
}
function copyText(value,status,label='Copied'){
  const fallback=()=>{const area=document.createElement('textarea');area.value=value;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();if(!ok)throw new Error('Copy failed')};
  const operation=navigator.clipboard?.writeText?navigator.clipboard.writeText(value).catch(fallback):Promise.resolve().then(fallback);
  return operation.then(()=>{status.textContent=label;setTimeout(()=>{status.textContent=''},2200)}).catch(()=>{status.textContent='Copy failed. Select the address from your browser.'});
}

let dialog,lastTrigger,current;
function ensureDialog(){
  if(dialog)return dialog;
  dialog=document.createElement('div');dialog.className='share-dialog';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','share-dialog-title');
  dialog.innerHTML='<div class="share-panel"><div class="share-heading"><h2 id="share-dialog-title">Share</h2><button type="button" class="share-close" data-share-action="close" aria-label="Close sharing dialog">×</button></div><p class="share-copy"></p><div class="share-actions"></div><details class="share-qr"><summary>WeChat / Save QR</summary><canvas aria-label="QR code for this page"></canvas><button type="button" data-share-action="save-qr">Save QR as PNG</button><p>Generated locally in your browser.</p></details><p class="share-status" aria-live="polite" aria-atomic="true"></p></div>';
  document.body.append(dialog);
  dialog.addEventListener('click',event=>{if(event.target===dialog)closeShare();const action=event.target.closest('[data-share-action]')?.dataset.shareAction;if(!action)return;if(action==='close')closeShare();if(action==='copy')copyText(current.url,dialog.querySelector('.share-status'));if(action==='native')navigator.share({title:current.title,text:current.text,url:current.url}).then(closeShare).catch(()=>{});if(action==='citation')copyText(current.citation,dialog.querySelector('.share-status'),'Citation-style reference copied');if(action==='summary')copyText(current.summary,dialog.querySelector('.share-status'),'Summary copied');if(action==='save-qr'){const a=document.createElement('a');a.download='smbajwa-share-qr.png';a.href=dialog.querySelector('canvas').toDataURL('image/png');a.click()}});
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape')closeShare();if(event.key==='Tab'){const items=[...dialog.querySelectorAll('button,a[href],summary')].filter(x=>{const closed=x.closest('details:not([open])');return !x.hidden&&!x.disabled&&(!closed||x===closed.querySelector('summary'))&&x.getClientRects().length>0});const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});
  return dialog;
}
export function openShare(input,trigger){
  current=normalizeShareData(input);lastTrigger=trigger||document.activeElement;const modal=ensureDialog(),actions=modal.querySelector('.share-actions');actions.replaceChildren();
  if(typeof navigator.share==='function')actions.append(button('Share with device…','native'));
  actions.append(button('Copy link','copy'));
  for(const [name,href] of Object.entries(buildShareUrls(current))){const a=document.createElement('a');a.textContent=name;a.href=href;a.target='_blank';a.rel='noopener noreferrer';actions.append(a)}
  if(current.citation)actions.append(button('Copy citation-style reference','citation'));
  if(current.summary)actions.append(button('Copy summary','summary'));
  modal.querySelector('.share-copy').textContent=current.text;modal.querySelector('.share-status').textContent='';drawQr(modal.querySelector('canvas'),current.url);modal.hidden=false;document.body.classList.add('share-open');modal.querySelector('.share-close').focus();
}
export function closeShare(){if(!dialog)return;dialog.hidden=true;document.body.classList.remove('share-open');lastTrigger?.focus()}

if(typeof document!=='undefined')document.addEventListener('click',event=>{const trigger=event.target.closest('[data-share]');if(!trigger)return;event.preventDefault();openShare({url:trigger.dataset.shareUrl,title:trigger.dataset.shareTitle,text:trigger.dataset.shareText,citation:trigger.dataset.shareCitation,summary:trigger.dataset.shareSummary},trigger)});
