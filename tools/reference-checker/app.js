import { parseInput } from './src/parse.js';
import { compareRecords, plantWarnings } from './src/compare.js';
import { findDuplicates } from './src/duplicates.js';
import { classifyUpdates } from './src/updates.js';
import { exportReport } from './src/export.js';
import { createEvidenceCache } from './src/cache.js';
import { normalizeDoi, normalizeText, yearOf } from './src/normalize.js';
import { createPrivacyNotice, confirmLookup } from '../_shared/js/privacy.js';
import { provenanceRecord } from '../_shared/js/provenance.js';
import { downloadText } from '../_shared/js/download.js';
import { loadLocale, applyLocale } from '../_shared/js/locale.js';
import { safeTextElement } from '../_shared/js/dom.js';
import { safeUrl } from '../_shared/js/safe-link.js';

const $ = id => document.getElementById(id), cache = createEvidenceCache();
const state = { report: null };
const MAILTO = 'contact@smbajwa.com';
const el = (tag, value, className) => safeTextElement(document, tag, value, className);
const link = (label, value) => { const url = safeUrl(value); if (!url) return el('span', label); const node = el('a', label); node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer'; return node; };

$('privacy-slot').append(createPrivacyNotice({ local: ['reference parsing', 'duplicate detection', 'comparison, reports, and exports'], online: ['only normalized DOI values or citation title/author/year search fields after confirmation'], storage: 'Metadata responses use a 30-day IndexedDB cache. The latest evidence report can be restored locally. Clear both at any time.' }));
function status(message) { $('status').textContent = message; }
function emptyEntry(record) { return { local: record, remote: null, findings: plantWarnings(record), updates: [], sources: [], retrievedAt: null, status: 'Local review only' }; }
function saveReport() { try { localStorage.setItem('reference-checker:last-report', JSON.stringify(state.report)); } catch {} }
function summarize() {
  const records = state.report?.records || [], counts = { failure: 0, discrepancy: 0, advisory: 0 };
  records.forEach(r => { r.findings.forEach(f => counts[f.severity]++); r.updates.forEach(u => counts[u.severity]++); });
  $('summary').replaceChildren(...[['Records', records.length], ['Hard failures', counts.failure], ['Discrepancies', counts.discrepancy], ['Advisories', counts.advisory]].map(([label, value]) => { const card = el('div', null, 'summary-card'); card.append(el('b', value), el('span', label)); return card; }));
}
function setRecordStatus(entry) {
  const severities = [...entry.findings, ...entry.updates].map(item => item.severity);
  entry.status = severities.includes('failure') ? 'Hard failure / alert' : severities.includes('discrepancy') ? 'Metadata discrepancy' : severities.includes('advisory') ? 'Advisory review' : entry.sources.length ? 'No alert match found' : 'Local review only';
}
function render() {
  summarize(); const results = $('results'); results.replaceChildren();
  if (!state.report?.records?.length) { results.append(el('div', 'No records to show.', 'empty-state')); return; }
  state.report.records.forEach((entry, index) => {
    setRecordStatus(entry); const card = el('article', null, 'result-card record-card'), header = document.createElement('header'), heading = el('h3', entry.local.title || entry.remote?.title || entry.local.DOI || 'Untitled record'); header.append(heading, el('span', `Reference ${index + 1}`, 'record-number')); card.append(header, el('p', entry.status, `status-pill ${entry.status.startsWith('Hard') ? 'invalid' : 'valid'}`));
    const details = [entry.local.DOI ? `DOI ${entry.local.DOI}` : 'No DOI supplied', yearOf(entry.local), (entry.local.author || []).map(a => a.family || a.literal).filter(Boolean).join(', ')].filter(Boolean).join(' · '); card.append(el('p', details));
    const findings = [...entry.updates.map(u => ({ ...u, message: `${u.label}${u.doi ? ` (${u.doi})` : ''} — ${u.source}` })), ...entry.findings];
    if (!findings.length && entry.sources.length) findings.push({ severity: 'advisory', message: 'No matching update alert was returned. This is absence of a match, not proof of integrity.' });
    if (findings.length) { const list = el('ul', null, 'finding-list'); findings.forEach(f => { const item = el('li', f.message, `finding ${f.severity}`); if (f.expected != null || f.returned != null) item.append(el('small', `Local: ${f.expected ?? 'missing'} · Source: ${f.returned ?? 'missing'}`)); list.append(item); }); card.append(list); }
    const sources = el('div', null, 'source-strip'); entry.sources.forEach(source => { const chip = el('span', null, 'source-chip'); chip.append(link(`${source.name} · ${source.status}`, source.url)); sources.append(chip); }); if (entry.local.DOI) sources.append(link('Resolve DOI', `https://doi.org/${encodeURIComponent(entry.local.DOI)}`)); card.append(sources); results.append(card);
  }); $('download').disabled = false;
}

function analyse() {
  const parsed = parseInput($('reference-input').value, window.Cite), duplicates = findDuplicates(parsed.records);
  state.report = { schema: 'smbajwa-reference-audit-v1', generatedAt: new Date().toISOString(), mode: 'local', records: parsed.records.map(emptyEntry), parseWarnings: parsed.warnings, duplicateGroups: duplicates, limitations: ['No alert found is not proof of integrity.', 'Metadata can be incomplete, delayed, or conflicting.'] };
  duplicates.forEach(group => group.indexes.forEach(index => state.report.records[index].findings.push({ severity: 'discrepancy', field: 'duplicate', message: `Possible duplicate: reference ${group.indexes.find(i => i !== index) + 1}. ${group.reason}.` })));
  render(); saveReport(); $('online').disabled = !parsed.records.length; status(`${parsed.records.length} record${parsed.records.length === 1 ? '' : 's'} analysed locally. ${duplicates.length} possible duplicate pair${duplicates.length === 1 ? '' : 's'} found.${parsed.warnings.length ? ` ${parsed.warnings.join(' ')}` : ''}`);
}

function crossrefUrl(record) {
  if (record.DOI) return `https://api.crossref.org/works/${encodeURIComponent(normalizeDoi(record.DOI))}?mailto=${encodeURIComponent(MAILTO)}`;
  const params = new URLSearchParams({ 'query.bibliographic': record.title || '', rows: '1', mailto: MAILTO });
  const author = record.author?.[0]?.family; if (author) params.set('query.author', author); return `https://api.crossref.org/works?${params}`;
}
function openAlexUrl(record) { const target = record.DOI ? `https://doi.org/${record.DOI}` : null; return target ? `https://api.openalex.org/works/${encodeURIComponent(target)}?mailto=${encodeURIComponent(MAILTO)}` : `https://api.openalex.org/works?search=${encodeURIComponent(record.title || '')}&per-page=1&mailto=${encodeURIComponent(MAILTO)}`; }
async function requestJson(url, key, retries = 2) {
  const cached = await cache.get(key); if (cached) return { data: cached, cached: true };
  for (let attempt = 0; ; attempt++) { const response = await fetch(url, { headers: { Accept: 'application/json' } }); if (response.ok) { const data = await response.json(); await cache.set(key, data); return { data, cached: false }; } if ((response.status === 429 || response.status >= 500) && attempt < retries) { const wait = Math.min(Number(response.headers.get('Retry-After')) * 1000 || 700 * 2 ** attempt, 5000); await new Promise(resolve => setTimeout(resolve, wait)); continue; } throw new Error(response.status === 404 ? 'No record found (404).' : response.status === 429 ? 'Rate limit reached (429).' : `Provider returned HTTP ${response.status}.`); }
}
function crossrefRecord(message) { return { id: message.DOI, DOI: normalizeDoi(message.DOI || ''), title: message.title?.[0] || '', author: message.author || [], issued: message.issued, 'container-title': message['container-title']?.[0], publisher: message.publisher, URL: message.URL, abstract: undefined }; }
function openAlexRecord(work) { return { id: work.id, DOI: normalizeDoi(work.doi || ''), title: work.display_name || '', author: (work.authorships || []).map(a => ({ family: a.author?.display_name || '' })), issued: work.publication_year ? { 'date-parts': [[work.publication_year]] } : undefined, 'container-title': work.primary_location?.source?.display_name, URL: work.id, abstract: undefined }; }
async function checkEntry(entry, useOpenAlex) {
  entry.findings = plantWarnings(entry.local); entry.updates = []; entry.sources = []; entry.retrievedAt = new Date().toISOString();
  const cUrl = crossrefUrl(entry.local), cKey = `crossref:${entry.local.DOI || normalizeText(entry.local.title)}`;
  try { const response = await requestJson(cUrl, cKey), message = entry.local.DOI ? response.data.message : response.data.message?.items?.[0]; if (!message) throw new Error('No matching record found.'); entry.remote = crossrefRecord(message); entry.findings.push(...compareRecords(entry.local, entry.remote)); entry.updates = classifyUpdates(message); entry.sources.push({ ...provenanceRecord({ source: 'Crossref', url: cUrl, status: response.cached ? 'cached' : 'retrieved' }), name: 'Crossref' }); } catch (error) { entry.findings.push({ severity: entry.local.DOI ? 'failure' : 'discrepancy', field: 'lookup', message: `Crossref: ${error.message}` }); entry.sources.push({ name: 'Crossref', url: cUrl, status: 'failed' }); }
  if (useOpenAlex) { const oUrl = openAlexUrl(entry.local); try { const response = await requestJson(oUrl, `openalex:${entry.local.DOI || normalizeText(entry.local.title)}`), work = entry.local.DOI ? response.data : response.data.results?.[0]; if (!work) throw new Error('No matching record found.'); const secondary = openAlexRecord(work); entry.findings.push(...compareRecords(entry.remote || entry.local, secondary).map(f => ({ ...f, message: `Crossref/OpenAlex: ${f.message}` }))); entry.sources.push({ name: 'OpenAlex', url: oUrl, status: response.cached ? 'cached' : 'retrieved' }); } catch (error) { entry.findings.push({ severity: 'advisory', field: 'lookup', message: `OpenAlex: ${error.message}` }); entry.sources.push({ name: 'OpenAlex', url: oUrl, status: 'failed' }); } }
  setRecordStatus(entry);
}
async function checkOnline() {
  const useOpenAlex = $('openalex').checked, domains = ['api.crossref.org', ...(useOpenAlex ? ['api.openalex.org'] : [])]; if (!confirmLookup(domains)) { status('Online check cancelled. Local report remains available.'); return; }
  $('online').disabled = true; for (let i = 0; i < state.report.records.length; i++) { status(`Checking reference ${i + 1} of ${state.report.records.length}…`); await checkEntry(state.report.records[i], useOpenAlex); render(); }
  state.report.mode = useOpenAlex ? 'Crossref + OpenAlex' : 'Crossref'; state.report.generatedAt = new Date().toISOString(); saveReport(); $('online').disabled = false; status('Online evidence check complete. Review all linked source records.');
}

$('analyse').addEventListener('click', analyse); $('online').addEventListener('click', checkOnline);
$('example').addEventListener('click', () => { $('reference-input').value = '@article{demo, title={Genome editing in Oryza sativa cv. Nipponbare}, author={Khan, A and Smith, J}, year={2020}, doi={10.1038/s41586-020-2649-2}}\n\n10.1038/s41586-020-2649-2'; analyse(); });
$('reference-file').addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; $('reference-input').value = await file.text(); status(`Read ${file.name} locally. Choose “Analyse locally”.`); });
$('clear').addEventListener('click', () => { $('reference-input').value = ''; $('reference-file').value = ''; state.report = null; $('summary').replaceChildren(); $('results').replaceChildren(el('div', 'Add references and choose “Analyse locally” to begin.', 'empty-state')); $('online').disabled = $('download').disabled = true; status('Cleared current input.'); });
$('rerun').addEventListener('click', () => { try { state.report = JSON.parse(localStorage.getItem('reference-checker:last-report')); if (!state.report) throw new Error(); render(); $('online').disabled = false; status('Restored the most recent browser-local report.'); } catch { status('No saved local report is available.'); } });
$('clear-cache').addEventListener('click', async () => { await cache.clear(); try { localStorage.removeItem('reference-checker:last-report'); } catch {} status('Cached evidence and saved report cleared.'); });
$('download').addEventListener('click', () => { const format = $('export-format').value, output = exportReport(state.report, format), ext = format === 'md' ? 'md' : format; downloadText(`reference-integrity-report.${ext}`, output, format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/markdown'); status('Report downloaded.'); });
$('language').addEventListener('change', async event => { const code = event.target.value; applyLocale(await loadLocale('./locales', code)); document.documentElement.lang = code; document.body.classList.toggle('rtl', code === 'ur'); document.documentElement.dir = code === 'ur' ? 'rtl' : 'ltr'; });
