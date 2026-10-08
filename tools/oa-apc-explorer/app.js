import Fuse from './third_party/fuse/7.5.0/fuse.min.mjs?v=17';
import { normalizeJournal } from './src/normalize.js?v=17';
import { joinByIssn } from './src/join.js?v=17';
import { filterJournals, sortJournals } from './src/filters.js?v=17';
import { toggleComparison, comparisonRows, MAX_COMPARE } from './src/compare.js?v=17';
import { calculateBudget } from './src/budget.js?v=17';
import { formatMoney } from './src/currency.js?v=17';
import { toCsv, toJson } from './src/export.js?v=17';
import { readCache, writeCache, clearCache } from './src/cache.js?v=17';
import { safeTextElement } from '../_shared/js/dom.js?v=17';
import { safeUrl } from '../_shared/js/safe-link.js?v=17';
import { fetchJsonWithRateLimitRetry } from './src/fetch.js?v=17';

const $ = id => document.getElementById(id);
const state = {journals: [], compared: [], fuse: null};
const els = Object.fromEntries(['resultTotal','searchForm','query','status','localQuery','feeFilter','licenseFilter','sort','plantFilter','waiverFilter','results','empty','count','compareSection','compareBody','budgetForm','budgetResult'].map(id => [id, $(id)]));
const external = anchor => { anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; return anchor; };
function element(tag, text, className) { return safeTextElement(document, tag, text, className); }
function setStatus(message, error = false) { els.status.textContent = message; els.status.classList.toggle('error', error); }

async function fetchJson(url) {
  const cached = readCache(url);
  if (cached) return {data: cached, cached: true};
  const response = await fetchJsonWithRateLimitRetry(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const data = await response.json(); writeCache(url, data); return {data, cached: false};
}

async function searchDoaj(query) {
  const url = `https://doaj.org/api/search/journals/${encodeURIComponent(query)}?pageSize=30`;
  const {data, cached} = await fetchJson(url);
  const results = data.results || [];
  const retrievedAt = new Date().toISOString();
  return {journals: results.map(item => normalizeJournal({...item, _retrievedAt: retrievedAt})), cached};
}

async function enrichOpenAlex(journals) {
  const issns = [...new Set(journals.flatMap(item => item.issns))].slice(0, 50);
  if (!issns.length) return {journals, warning: 'No valid ISSNs were returned, so OpenAlex context was not requested.'};
  const filter = issns.join('|');
  const url = `https://api.openalex.org/sources?filter=issn:${encodeURIComponent(filter)}&per-page=50&mailto=contact%40smbajwa.com`;
  try { const {data} = await fetchJson(url); return {journals: joinByIssn(journals, data.results || []), warning: ''}; }
  catch (error) { return {journals, warning: ` OpenAlex context is temporarily unavailable (${error.message}); DOAJ declarations are still shown.`}; }
}

function feeText(journal) {
  if (journal.apcState === 'none') return 'Declares no APC';
  if (journal.apcState === 'unknown') return 'APC unknown / not reported';
  return journal.prices.map(item => formatMoney(item.amount, item.currency)).join(' · ');
}
function openAlexText(journal) {
  if (!journal.openAlex) return 'Not matched by ISSN';
  const parts = [];
  if (journal.openAlex.worksCount != null) parts.push(`${Number(journal.openAlex.worksCount).toLocaleString()} indexed works`);
  if (journal.openAlex.oaPercent != null) parts.push(`${journal.openAlex.oaPercent}% OA`);
  return parts.join(' · ') || 'Source matched';
}
function card(journal) {
  const article = element('article', null, 'journal-card');
  const sourceUrl = safeUrl(journal.sourceUrl), source = sourceUrl ? external(element('a', 'DOAJ record')) : element('span', 'DOAJ record'); if (sourceUrl) source.href = sourceUrl;
  const compare = element('button', state.compared.includes(journal.id) ? 'Remove from compare' : 'Compare', 'secondary');
  compare.type = 'button'; compare.disabled = !state.compared.includes(journal.id) && state.compared.length >= MAX_COMPARE;
  compare.onclick = () => { state.compared = toggleComparison(state.compared, journal.id); render(); };
  article.append(element('p', journal.subjects.slice(0, 2).join(' · ') || 'Open-access journal', 'kicker'), element('h3', journal.title), element('p', journal.publisher, 'publisher'));
  const badges = element('div', null, 'badges');
  badges.append(element('span', journal.apcState === 'amount' ? 'Amount declared' : journal.apcState === 'none' ? 'No APC declared' : 'Fee not reported', `badge ${journal.apcState === 'unknown' ? 'unknown' : ''}`));
  badges.append(element('span', journal.waiver === 'present' ? 'Waiver info present' : 'Waiver info unknown', `badge ${journal.waiver === 'present' ? '' : 'unknown'}`));
  article.append(badges, element('p', feeText(journal), 'fee'), element('p', `Licence: ${journal.licenses.join(', ') || 'not reported'}`, 'evidence'), element('p', `ISSN: ${journal.issns.join(', ') || 'not reported'}`, 'evidence'), element('p', `OpenAlex: ${openAlexText(journal)}`, 'evidence'), element('p', `Retrieved ${new Date(journal.retrievedAt).toLocaleString()}`, 'evidence'));
  const actions = element('div', null, 'card-actions'); actions.append(source);
  if (journal.openAlex?.sourceUrl) { const sourceUrl = safeUrl(journal.openAlex.sourceUrl), oa = sourceUrl ? external(element('a', 'OpenAlex record')) : element('span', 'OpenAlex record'); if (sourceUrl) oa.href = sourceUrl; actions.append(oa); }
  actions.append(compare); article.append(actions); return article;
}

function visibleJournals() {
  const options = {query: els.localQuery.value, fee: els.feeFilter.value, license: els.licenseFilter.value, plant: els.plantFilter.checked, waiver: els.waiverFilter.checked};
  let rows = filterJournals(state.journals, {...options, query: ''});
  if (options.query && state.fuse) {
    const ids = new Set(state.fuse.search(options.query).map(match => match.item.id));
    rows = rows.filter(item => ids.has(item.id));
  }
  return sortJournals(rows, els.sort.value);
}
function renderCompare() {
  const rows = comparisonRows(state.journals, state.compared); els.compareSection.hidden = !rows.length; els.compareBody.replaceChildren();
  for (const journal of rows) {
    const tr = document.createElement('tr');
    [journal.title, feeText(journal), journal.waiver === 'present' ? 'Present' : 'Not reported here', journal.licenses.join(', ') || 'Not reported', openAlexText(journal)].forEach(value => tr.append(element('td', value)));
    const td = document.createElement('td'), button = element('button', 'Remove', 'secondary'); button.type = 'button'; button.onclick = () => { state.compared = toggleComparison(state.compared, journal.id); render(); }; td.append(button); tr.append(td); els.compareBody.append(tr);
  }
}
function render() {
  const rows = visibleJournals(); els.results.replaceChildren(...rows.map(card)); els.empty.hidden = !!rows.length;
  els.empty.textContent = state.journals.length ? 'No loaded journals match these filters. Missing does not mean zero.' : 'Search DOAJ to load current journal declarations.';
  els.count.textContent = `${rows.length} of ${state.journals.length} loaded journals`; els.resultTotal.textContent = state.journals.length; renderCompare();
}

els.searchForm.addEventListener('submit', async event => {
  event.preventDefault(); const query = els.query.value.trim(); if (query.length < 2) return;
  const button = event.submitter; button.disabled = true; setStatus('Requesting current DOAJ metadata…');
  try {
    const found = await searchDoaj(query); setStatus(`DOAJ returned ${found.journals.length} journal records. Checking OpenAlex by ISSN…`);
    const enriched = await enrichOpenAlex(found.journals); state.journals = enriched.journals; state.compared = [];
    state.fuse = new Fuse(state.journals, {keys: ['title','publisher','issns','subjects'], threshold: .34, ignoreLocation: true}); render();
    setStatus(`${state.journals.length} records loaded${found.cached ? ' from the local cache' : ' from DOAJ'}.${enriched.warning}`);
  } catch (error) { setStatus(`The lookup could not be completed: ${error.message}. Try again later or refine the query.`, true); }
  finally { button.disabled = false; }
});
['localQuery','feeFilter','licenseFilter','sort','plantFilter','waiverFilter'].forEach(id => $(id).addEventListener(id === 'localQuery' ? 'input' : 'change', render));
$('resetFilters').onclick = () => { els.localQuery.value = els.feeFilter.value = els.licenseFilter.value = ''; els.sort.value = 'title'; els.plantFilter.checked = els.waiverFilter.checked = false; render(); };
$('clearCache').onclick = () => { clearCache(); setStatus('Cached API responses cleared. Loaded cards remain until the next search or page reload.'); };

function download(name, contents, type) { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([contents], {type})); link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }
$('exportCsv').onclick = () => download('oa-apc-shortlist.csv', toCsv(comparisonRows(state.journals, state.compared)), 'text/csv;charset=utf-8');
$('exportJson').onclick = () => download('oa-apc-shortlist.json', toJson(comparisonRows(state.journals, state.compared)), 'application/json');
els.budgetForm.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const source = $('sourceCurrency').value.trim().toUpperCase(), target = $('targetCurrency').value.trim().toUpperCase();
    const budget = calculateBudget({amount: $('budgetAmount').value, articles: $('articles').value, waiverPercent: $('waiverPercent').value, taxPercent: $('taxPercent').value, uncertaintyPercent: $('uncertaintyPercent').value, rate: $('rate').value});
    els.budgetResult.textContent = `Original-currency range: ${formatMoney(budget.low, source)}–${formatMoney(budget.high, source)} (expected ${formatMoney(budget.expected, source)}). At your manual rate: ${formatMoney(budget.converted.low, target)}–${formatMoney(budget.converted.high, target)} (expected ${formatMoney(budget.converted.expected, target)}). This is a planning scenario, not a publisher quote.`;
  } catch (error) { els.budgetResult.textContent = error.message; }
});
render();
