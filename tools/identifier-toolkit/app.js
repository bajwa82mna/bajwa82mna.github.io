import { detectIdentifiers } from './src/detect.js';
import { buildLookupUrls } from './src/lookup.js';
import { crossrefToCsl, openAlexToCsl, compareMetadata } from './src/format.js';
import { exportRecords } from './src/export.js';
import { createLocalCache } from '../_shared/js/cache.js';
import { provenanceRecord, renderProvenance } from '../_shared/js/provenance.js';
import { createPrivacyNotice, confirmLookup } from '../_shared/js/privacy.js';
import { copyText, downloadText } from '../_shared/js/download.js';
import { safeTextElement } from '../_shared/js/dom.js';
import { safeUrl } from '../_shared/js/safe-link.js';

const $ = id => document.getElementById(id);
const state = { items: [], records: [] };
const cache = createLocalCache('identifier-toolkit:v1');
const text = (tag, value, className) => safeTextElement(document, tag, value, className);
const externalLink = (label, value) => { const url = safeUrl(value); if (!url) return safeTextElement(document, 'span', label); const link = document.createElement('a'); link.textContent = label; link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; return link; };

$('privacy-slot').append(createPrivacyNotice({
  local: ['pasted text', 'checksum validation', 'citation formatting and exports'],
  online: ['only each valid identifier you explicitly submit to the selected public providers'],
  storage: 'Lookup responses are cached in this browser for 30 days. Recent-input history is not stored. Use “Clear lookup cache” at any time.'
}));

function setStatus(message) { $('status').textContent = message; }
function updateActions() {
  $('lookup').disabled = !state.items.some(item => item.valid && (item.type === 'doi' || item.type === 'issn'));
  const noRecords = state.records.length === 0;
  $('copy-all').disabled = noRecords;
  $('download-all').disabled = noRecords;
}

function identifierCard(item) {
  const card = document.createElement('article'); card.className = 'result-card';
  const header = document.createElement('header');
  const heading = text('h3', item.normalized || item.raw);
  const type = text('span', item.type, 'identifier-type');
  header.append(heading, type);
  const status = text('span', item.valid ? 'Valid checksum / syntax' : 'Needs attention', `status-pill ${item.valid ? 'valid' : 'invalid'}`);
  const detail = text('p', item.valid ? `Normalized from: ${item.raw}` : item.reason);
  card.append(header, status, detail);
  if (item.type === 'orcid' && item.valid) {
    const actions = document.createElement('p'); actions.className = 'source-actions';
    actions.append(externalLink('Open public ORCID record', buildLookupUrls(item).record)); card.append(actions);
  }
  item.element = card;
  return card;
}

function analyse() {
  const input = $('identifier-input').value;
  state.records = [];
  state.items = detectIdentifiers(input);
  const results = $('results'); results.replaceChildren();
  if (!state.items.length) {
    try {
      const cite = new window.Cite(input);
      state.records = cite.data.map(record => ({ ...record, abstract: undefined }));
      if (!state.records.length) throw new Error('No supported citation records found.');
      results.append(...state.records.map((record, index) => recordCard(record, `Imported record ${index + 1}`)));
      setStatus(`${state.records.length} citation record${state.records.length === 1 ? '' : 's'} parsed locally.`);
    } catch { results.append(text('div', 'No DOI, ISSN, ISBN, ORCID, BibTeX, RIS or supported citation record was detected.', 'empty-state')); setStatus('Nothing recognized. Check the example and input format.'); }
  } else {
    results.append(...state.items.map(identifierCard));
    const valid = state.items.filter(item => item.valid).length;
    setStatus(`${state.items.length} identifier${state.items.length === 1 ? '' : 's'} found; ${valid} valid.`);
  }
  updateActions();
}

function recordCard(record, label, provenance, differences = []) {
  const block = document.createElement('section'); block.className = 'record-block';
  block.append(text('p', label, 'kicker'), text('h4', record.title || record['container-title'] || record.DOI || 'Metadata record', 'metadata-title'));
  const authorNames = (record.author || []).map(author => [author.given, author.family].filter(Boolean).join(' ')).join(', ');
  if (authorNames) block.append(text('p', authorNames, 'authors'));
  const details = document.createElement('p');
  const year = record.issued?.['date-parts']?.[0]?.[0];
  details.textContent = [record['container-title'], year, record.publisher].filter(Boolean).join(' · ') || 'No additional bibliographic fields returned.';
  block.append(details);
  if (differences.length) {
    block.append(text('p', 'Cross-source differences (review at source):', 'kicker'));
    differences.forEach(item => block.append(text('p', `${item.field}: Crossref “${item.primary}” · OpenAlex “${item.secondary}”`, 'difference')));
  }
  if (provenance) { const line = document.createElement('p'); line.className = 'provenance'; line.append(renderProvenance(provenance)); block.append(line); }
  const actions = document.createElement('p'); actions.className = 'source-actions';
  if (record.URL) actions.append(externalLink('Open primary record', record.URL));
  if (record.DOI) actions.append(externalLink('Resolve DOI', `https://doi.org/${encodeURIComponent(record.DOI)}`));
  block.append(actions);
  return block;
}

async function requestJson(url, key) {
  const cached = cache.get(key); if (cached) return { data: cached, cached: true };
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(response.status === 404 ? 'No record found.' : response.status === 429 ? 'Provider rate limit reached. Try again later.' : `Provider returned HTTP ${response.status}.`);
  const data = await response.json(); cache.set(key, data); return { data, cached: false };
}

async function lookupItem(item, providers) {
  const urls = buildLookupUrls(item), outputs = [], errors = [];
  let primary = null;
  if (item.type === 'doi' && providers.crossref) try {
    const result = await requestJson(urls.crossref, `crossref:${item.normalized}`); primary = crossrefToCsl(result.data.message); state.records.push(primary);
    outputs.push({ record: primary, label: result.cached ? 'Crossref metadata · cached' : 'Crossref metadata', provenance: provenanceRecord({ source: 'Crossref', url: urls.crossref, status: result.cached ? 'cached' : 'retrieved' }) });
  } catch (error) { errors.push(`Crossref: ${error.message}`); }
  if (item.type === 'doi' && providers.openalex) try {
    const result = await requestJson(urls.openalex, `openalex:${item.normalized}`), secondary = openAlexToCsl(result.data);
    if (!primary) state.records.push(secondary);
    outputs.push({ record: secondary, label: result.cached ? 'OpenAlex evidence · cached' : 'OpenAlex evidence', provenance: provenanceRecord({ source: 'OpenAlex', url: urls.openalex, status: result.cached ? 'cached' : 'retrieved' }), differences: primary ? compareMetadata(primary, secondary) : [] });
  } catch (error) { errors.push(`OpenAlex: ${error.message}`); }
  if (item.type === 'issn' && providers.crossref) try {
    const result = await requestJson(urls.crossref, `crossref-journal:${item.normalized}`), message = result.data.message || {};
    const record = { id: item.normalized, type: 'article-journal', ISSN: message.ISSN, title: message.title, publisher: message.publisher, URL: `https://api.crossref.org/journals/${encodeURIComponent(item.normalized)}` };
    outputs.push({ record, label: 'Crossref journal metadata', provenance: provenanceRecord({ source: 'Crossref', url: urls.crossref, status: result.cached ? 'cached' : 'retrieved' }) });
  } catch (error) { errors.push(`Crossref: ${error.message}`); }
  if (item.type === 'issn' && providers.openalex) try {
    const result = await requestJson(urls.openalex, `openalex-source:${item.normalized}`), source = result.data;
    outputs.push({ record: { id: source.id, title: source.display_name, ISSN: source.issn, publisher: source.host_organization_name, URL: source.id }, label: 'OpenAlex source evidence', provenance: provenanceRecord({ source: 'OpenAlex', url: urls.openalex, status: result.cached ? 'cached' : 'retrieved' }) });
  } catch (error) { errors.push(`OpenAlex: ${error.message}`); }
  if (item.type === 'issn' && providers.doaj) try {
    const result = await requestJson(urls.doaj, `doaj:${item.normalized}`), hit = result.data.results?.[0]?.bibjson;
    if (!hit) throw new Error('No record found.');
    outputs.push({ record: { id: item.normalized, title: hit.title, publisher: hit.publisher?.name, ISSN: hit.pissn || hit.eissn, URL: hit.link?.[0]?.url || 'https://doaj.org/' }, label: 'DOAJ journal evidence', provenance: provenanceRecord({ source: 'DOAJ', url: urls.doaj, status: result.cached ? 'cached' : 'retrieved' }) });
  } catch (error) { errors.push(`DOAJ: ${error.message}`); }
  outputs.forEach(output => item.element.append(recordCard(output.record, output.label, output.provenance, output.differences)));
  errors.forEach(message => item.element.append(text('p', message, 'difference')));
}

async function lookup() {
  const providers = { crossref: $('use-crossref').checked, openalex: $('use-openalex').checked, doaj: $('use-doaj').checked };
  const domains = [...new Set([providers.crossref && 'api.crossref.org', providers.openalex && 'api.openalex.org', providers.doaj && 'doaj.org'].filter(Boolean))];
  if (!domains.length) { setStatus('Choose at least one provider.'); return; }
  if (!confirmLookup(domains)) { setStatus('Online lookup cancelled. Local results remain available.'); return; }
  $('lookup').disabled = true; state.records = [];
  const valid = state.items.filter(item => item.valid && (item.type === 'doi' || item.type === 'issn'));
  for (let index = 0; index < valid.length; index++) { setStatus(`Looking up ${index + 1} of ${valid.length}…`); await lookupItem(valid[index], providers); }
  setStatus(`Lookup finished. ${state.records.length} citation record${state.records.length === 1 ? '' : 's'} ready to export.`); updateActions();
}

function renderedExport() { return exportRecords(state.records, $('export-format').value, window.Cite); }
$('analyze').addEventListener('click', analyse);
$('lookup').addEventListener('click', lookup);
$('example').addEventListener('click', () => { $('identifier-input').value = 'DOI: 10.1038/nature12373\nISSN 0028-0836\nORCID 0000-0002-1825-0097\nISBN 978-0-306-40615-7'; analyse(); });
$('clear').addEventListener('click', () => { $('identifier-input').value = ''; state.items = []; state.records = []; $('results').replaceChildren(text('div', 'Paste identifiers and choose “Analyse locally” to begin.', 'empty-state')); setStatus('Cleared.'); updateActions(); });
$('clear-cache').addEventListener('click', () => { cache.clear(); setStatus('Lookup cache cleared.'); });
$('copy-all').addEventListener('click', async () => { try { await copyText(renderedExport()); setStatus('Export copied to the clipboard.'); } catch (error) { setStatus(error.message); } });
$('download-all').addEventListener('click', () => { const format = $('export-format').value, extension = { json: 'json', csv: 'csv', bibtex: 'bib', ris: 'ris' }[format] || 'txt'; downloadText(`identifier-toolkit-export.${extension}`, renderedExport(), format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/plain'); setStatus('Export downloaded.'); });
updateActions();
