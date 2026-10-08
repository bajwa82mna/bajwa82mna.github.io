import {safeTextElement} from '../_shared/js/dom.js?v=14';
import {safeUrl} from '../_shared/js/safe-link.js?v=14';
import {prepareQuery} from '../abstract-journal-matcher/src/preprocess.js?v=14';
import {createSearch} from '../abstract-journal-matcher/src/search.js?v=14';

const MAX_COMPARE = 5;
const $ = id => document.getElementById(id);
const text = (tag, value, cls) => safeTextElement(document, tag, value, cls);
const compact = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const timingByIssn = new Map();
const timingByTitle = new Map();
for (const row of window.JOURNAL_TIMING_DATA || []) {
  timingByTitle.set(compact(row.j), row);
  for (const issn of row.i || []) timingByIssn.set(compact(issn), row);
}
const journals = RAW.rows.map((row, index) => {
  const extra = EXTRA.rows[index];
  const issns = [row[4], row[5]].filter(Boolean);
  const timing = issns.map(value => timingByIssn.get(compact(value))).find(Boolean) || timingByTitle.get(compact(row[1]));
  return {index, rank:row[0], title:row[1], subject:RAW.cats[row[2]] || 'Unclassified', quartile:row[3], issns, extra, timing};
});
let visible = [], shown = 30, selected = null;
const compared = new Map();

function external(label, href) {
  const clean = safeUrl(href); if (!clean) return text('span', label);
  const link = text('a', label); link.href = clean; link.target = '_blank'; link.rel = 'noopener noreferrer'; return link;
}
function modeFromUrl() { const value = new URLSearchParams(location.search).get('mode'); return ['find','match','compare','trends','check'].includes(value) ? value : 'find'; }
function setMode(mode, focus = false) {
  const tabs = [...document.querySelectorAll('[role=tab]')];
  for (const tab of tabs) { const active = tab.dataset.mode === mode; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; $(tab.getAttribute('aria-controls')).hidden = !active; if (active && focus) tab.focus(); }
  const url = new URL(location.href); if (mode === 'find') url.searchParams.delete('mode'); else url.searchParams.set('mode', mode); history.replaceState(null, '', url);
}
for (const tab of document.querySelectorAll('[role=tab]')) tab.addEventListener('click', () => setMode(tab.dataset.mode));
document.querySelector('.tabs').addEventListener('keydown', event => { const tabs=[...document.querySelectorAll('[role=tab]')], current=tabs.indexOf(document.activeElement); let next=current; if(event.key==='ArrowRight')next=(current+1)%tabs.length;if(event.key==='ArrowLeft')next=(current-1+tabs.length)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==current){event.preventDefault();setMode(tabs[next].dataset.mode,true)}});

for (const subject of RAW.cats) { const option = document.createElement('option'); option.value = option.textContent = subject; $('subject').append(option); }
function evidenceValue(value, fallback='Not available in this snapshot') { return value == null || value === '' ? fallback : String(value); }
function timingText(metric) { return metric?.median == null ? `Not enough deposited dates (n=${metric?.n || 0})` : `${metric.median} days (median, n=${metric.n})`; }
function addCompare(journal) { if (compared.has(journal.index)) compared.delete(journal.index); else if (compared.size < MAX_COMPARE) compared.set(journal.index, journal); renderCompare(); renderResults(); }
function journalCard(journal) {
  const card=text('article','', 'journal-card'); card.append(text('p',`${journal.subject} · Q${journal.quartile} · rank ${journal.rank}`,'kicker'),text('h3',journal.title),text('p',`ISSN: ${journal.issns.join(', ') || 'not available'}`));
  const open=text('button','Open profile');open.type='button';open.onclick=()=>openProfile(journal);
  const compare=text('button',compared.has(journal.index)?'Remove from compare':'Add to compare');compare.type='button';compare.disabled=!compared.has(journal.index)&&compared.size>=MAX_COMPARE;compare.onclick=()=>addCompare(journal);card.append(open,compare);return card;
}
function searchRows(query) {
  const needle=compact(query), subject=$('subject').value, quartile=$('quartile').value, oa=$('oa-only').checked;
  let rows=journals.filter(j=>(!needle||compact(`${j.title} ${j.issns.join(' ')}`).includes(needle))&&(!subject||j.subject===subject)&&(!quartile||String(j.quartile)===quartile)&&(!oa||(j.timing?.oa||j.extra?.[4]===1)));
  if ($('sort').value==='name') rows.sort((a,b)=>a.title.localeCompare(b.title)); else if($('sort').value==='timing') rows.sort((a,b)=>(a.timing?.dw??1e9)-(b.timing?.dw??1e9));
  return rows;
}
function renderResults() { const box=$('results');box.replaceChildren(...visible.slice(0,shown).map(journalCard));$('more').hidden=shown>=visible.length;$('status').textContent=`${visible.length.toLocaleString()} matching journals. Showing ${Math.min(shown,visible.length).toLocaleString()}.`; }
function runSearch() { const query=$('hub-query').value.trim();if(query.split(/\s+/).length>25){$('match-abstract').value=query;setMode('match');$('match-form').requestSubmit();return}shown=30;visible=searchRows(query);renderResults(); if(visible.length===1)openProfile(visible[0]); }
$('search-form').addEventListener('submit',event=>{event.preventDefault();runSearch()});
for(const id of ['subject','quartile','oa-only','sort'])$(id).addEventListener('change',runSearch);
$('more').onclick=()=>{shown+=30;renderResults()};

function profileRow(dl,label,value){dl.append(text('dt',label),text('dd',value));}
function openProfile(journal) {
  selected=journal;const panel=$('profile'),timing=journal.timing,extra=journal.extra||[];panel.replaceChildren(text('p',journal.subject,'kicker'),text('h2',journal.title));
  const badges=text('div','');badges.append(text('span',`Q${journal.quartile}`,'badge'),text('span',timing?.oa?'OA evidence':'OA not confirmed','badge'),text('span',timing?.du?'DOAJ record':'DOAJ not linked','badge'));panel.append(badges);
  const identity=text('section','');identity.append(text('h3','Identity & ISSNs'));const idList=document.createElement('dl');profileRow(idList,'ISSNs',journal.issns.join(', ')||'Not available');profileRow(idList,'Publisher',evidenceValue(timing?.p||extra[7]));profileRow(idList,'Country',evidenceValue(extra[9]));profileRow(idList,'Subject',journal.subject);identity.append(idList);
  const access=text('section','');access.append(text('h3','OA, APC & waiver'),text('p',timing?.oa?'Open-access evidence appears in the joined DOAJ snapshot.':'OA status is not confirmed in the joined DOAJ snapshot.'),text('p','APC amount and waiver: verify the current publisher or DOAJ record; missing is not zero.'));
  const time=text('section','');time.append(text('h3','Timing evidence'),text('p',`DOAJ submission-to-publication: ${timing?.dw==null?'Not available':timing.dw+' weeks (journal-reported)'}`),text('p',`Crossref submission→acceptance: ${timingText(timing?.x?.submit_accept)}`),text('p',`Crossref acceptance→online: ${timingText(timing?.x?.accept_online)}`),text('p','Crossref medians include only published articles with usable deposited dates; rejected manuscripts are absent. These values are descriptive, not a service guarantee.'),text('p','Acceptance rate: Not openly available.'));
  const trust=text('section','');trust.append(text('h3','Trust signals'),text('p',`OpenAlex source match: ${extra[8]?'present':'not available'} · DOAJ link: ${timing?.du?'present':'not available'} · Crossref timing deposit: ${timing?.x?.n?`present (n=${timing.x.n})`:'not available'}. These are evidence signals, not a trust score or endorsement.`));
  const links=text('div','', 'evidence-links');if(timing?.du)links.append(external('DOAJ evidence',timing.du));if(extra[8])links.append(external('OpenAlex evidence',`https://openalex.org/sources/${extra[8]}`));if(journal.issns[0])links.append(external('Crossref journal search',`https://api.crossref.org/journals/${encodeURIComponent(journal.issns[0])}`));
  const actions=text('div','', 'profile-actions'),compare=text('button',compared.has(journal.index)?'Remove from comparison':'Add to comparison');compare.type='button';compare.onclick=()=>{addCompare(journal);openProfile(journal)};const explore=text('button','View citation trend');explore.type='button';explore.onclick=()=>{setMode('trends');loadTrend(journal)};const share=text('button','Copy deep link');share.type='button';share.onclick=()=>navigator.clipboard?.writeText(profileUrl(journal));actions.append(compare,explore,share);
  panel.append(identity,access,time,trust,links,actions);const url=new URL(location.href);url.searchParams.set('q',journal.title);url.searchParams.set('journal',journal.title);history.replaceState(null,'',url);
}
function profileUrl(journal){const url=new URL('https://smbajwa.com/tools/journal-hub/');url.searchParams.set('q',journal.title);url.searchParams.set('journal',journal.title);return url.href}
function renderCompare(){const body=$('compare-body');body.replaceChildren();for(const journal of compared.values()){const timing=journal.timing,tr=document.createElement('tr');for(const value of [journal.title,timing?.oa?'Confirmed in joined DOAJ':'Not confirmed','Verify current APC / waiver',timing?.dw==null?'—':`${timing.dw} weeks`,timingText(timing?.x?.submit_accept),`${timing?.du?'DOAJ ':''}${journal.extra?.[8]?'OpenAlex ':''}${timing?.x?.n?'Crossref':''}`||'Not available'])tr.append(text('td',value));const td=document.createElement('td'),remove=text('button','Remove');remove.onclick=()=>addCompare(journal);td.append(remove);tr.append(td);body.append(tr)}}

async function loadProfiles(){const response=await fetch('../abstract-journal-matcher/data/journal-profiles.min.json?v=14');if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()}
$('match-form').addEventListener('submit',async event=>{event.preventDefault();const box=$('match-results');box.replaceChildren(text('p','Building a local lexical shortlist…'));try{const profiles=await loadProfiles(),query=prepareQuery({title:$('match-title').value,abstract:$('match-abstract').value,keywords:$('match-keywords').value}),results=createSearch(window.MiniSearch,profiles)(query);box.replaceChildren(...results.map((item,index)=>{const card=text('article','', 'match-card');card.append(text('h3',`${index+1}. ${item.profile.title}`),text('p',`${item.profile.category} · ISSN ${item.profile.issn}`),text('p',`Lexical overlap: ${item.explanation.topics.concat(item.explanation.direct).slice(0,6).join(', ')||'broad terms'}`));const find=text('button','Find in Journal Hub');find.onclick=()=>{$('hub-query').value=item.profile.title;setMode('find');runSearch();if(visible[0])openProfile(visible[0])};card.append(find);return card}))}catch(error){box.replaceChildren(text('p',`Matcher unavailable: ${error.message}`))}});

function renderTrends(){const counts=[1,2,3,4].map(q=>[q,journals.filter(j=>j.quartile===q).length]);$('trend-summary').replaceChildren(...counts.map(([q,count])=>{const card=text('article','');card.append(text('h3',`Q${q}`),text('p',`${count.toLocaleString()} journals`));return card}))}renderTrends();
let trendRequest;
function loadTrend(journal){const summary=$('trend-summary');summary.replaceChildren(text('p',`Loading the OpenAlex trend for ${journal.title}…`));const chunk=Math.floor(journal.index*24/journals.length);window.TREND_CHUNKS=window.TREND_CHUNKS||{};const show=()=>{const points=window.TREND_CHUNKS[chunk]?.openalex?.[journal.index]||[];const card=text('article','');card.append(text('h3',journal.title),text('p','OpenAlex citations per paper by year. Recent years are lower because newer papers have had less time to be cited.'));if(points.length){const list=document.createElement('ul');for(const point of points)list.append(text('li',`${point[0]}: ${point[2]?Number(point[1]/point[2]).toFixed(2):'unavailable'} citations per paper`));card.append(list)}else card.append(text('p','Yearly trend data are unavailable for this journal.'));summary.replaceChildren(card)};if(window.TREND_CHUNKS[chunk])return show();const script=document.createElement('script');script.src=`../emerging-journals-2026/trends/trends-${chunk}.js?v=14`;script.onload=show;script.onerror=()=>summary.replaceChildren(text('p','The trend chunk could not be loaded.'));trendRequest=script;document.head.append(script)}
async function json(url){const response=await fetch(url,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()}
$('check-form').addEventListener('submit',async event=>{event.preventDefault();const query=$('check-query').value.trim(),status=$('check-status'),box=$('check-results');status.textContent='Checking Crossref, OpenAlex and DOAJ…';box.replaceChildren();const issn=/^\d{4}-?\d{3}[\dX]$/i.test(query)?query.replace(/^(\d{4})-?(\d{3}[\dX])$/i,'$1-$2'):'';const calls=[json(issn?`https://api.crossref.org/journals/${issn}`:`https://api.crossref.org/journals?query=${encodeURIComponent(query)}&rows=3`),json(`https://api.openalex.org/sources?search=${encodeURIComponent(query)}&per-page=3`),json(`https://doaj.org/api/search/journals/${encodeURIComponent(issn?`bibjson.eissn:${issn} OR bibjson.pissn:${issn}`:query)}?pageSize=3`)];const results=await Promise.allSettled(calls),names=['Crossref','OpenAlex','DOAJ'];results.forEach((result,index)=>{const section=text('section','', 'journal-card');section.append(text('h3',names[index]),text('p',result.status==='fulfilled'?'Open record returned; inspect the primary source for current details.':`Unavailable: ${result.reason.message}`));box.append(section)});status.textContent='Live check finished. Returned records are evidence, not an endorsement or trust score.'});

const params=new URLSearchParams(location.search),initial=params.get('journal')||params.get('q');if(initial){$('hub-query').value=initial;runSearch();const exact=visible.find(j=>compact(j.title)===compact(initial))||visible[0];if(exact)openProfile(exact)}else{visible=journals;renderResults()}setMode(modeFromUrl());
