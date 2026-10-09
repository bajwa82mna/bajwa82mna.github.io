import { normalizeIssn } from './issn.js?v=22';

const CONTACT = 'contact@smbajwa.com';
const clean = value => value == null || value === '' ? null : value;
const arr = value => Array.isArray(value) ? value : value ? [value] : [];
async function jsonFetch(url, fetcher = fetch) {
  const response = await fetcher(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText || 'request failed'}`);
  return response.json();
}

export function mapDoaj(data, retrievedAt = new Date().toISOString()) {
  const hit = data?.results?.[0]; if (!hit) return null;
  const b = hit.bibjson || {}, apc = b.apc || {}, license = arr(b.license).map(x => x.type || x.title).filter(Boolean);
  return { source: 'DOAJ', url: hit.id ? `https://doaj.org/toc/${hit.id}` : 'https://doaj.org/', retrievedAt, title: b.title, publisher: b.publisher?.name, issns: arr(b.pissn).concat(arr(b.eissn)).map(normalizeIssn), subjects: arr(b.subject).map(x => x.term).filter(Boolean), oa: true, doajSeal: Boolean(b.seal), apc: apc.has_apc === false ? { declared: true, amount: 0 } : apc.has_apc === true ? { declared: true, amounts: apc.max || apc.amount || [] } : null, waiver: clean(apc.waiver), licenses: license, copyright: clean(b.copyright?.author_retains), preservation: arr(b.preservation_service).map(x => x.service || x).filter(Boolean), review: clean(b.editorial?.review_process?.join?.(', ')), added: hit.created_date || null };
}

export function mapOpenAlex(data, retrievedAt = new Date().toISOString()) {
  const s = data?.results?.[0]; if (!s) return null;
  return { source: 'OpenAlex', url: s.id || 'https://openalex.org/', retrievedAt, title: s.display_name, publisher: s.host_organization_name, issns: arr(s.issn).map(normalizeIssn), issnL: normalizeIssn(s.issn_l || ''), oa: s.is_oa, worksCount: s.works_count, citedByCount: s.cited_by_count, country: s.country_code, homepage: s.homepage_url, topics: arr(s.topics).map(x => x.display_name).filter(Boolean), years: s.counts_by_year || [] };
}

export function mapCrossref(data, retrievedAt = new Date().toISOString(), issn = '') {
  const message = data?.message || {}, items = message.items || [], first = items[0] || {};
  const titles = arr(first['container-title']);
  return { source: 'Crossref', url: issn ? `https://api.crossref.org/journals/${encodeURIComponent(issn)}` : 'https://search.crossref.org/', retrievedAt, title: titles[0], publisher: first.publisher, issns: arr(first.ISSN).map(normalizeIssn), worksCount: message['total-results'], recentWorks: items.map(w => ({ title: arr(w.title)[0] || 'Untitled work', doi: w.DOI || null, published: w.published?.['date-parts']?.[0]?.join('-') || null })).filter(w => w.title) };
}

export async function lookupDoaj({ issn, title }, fetcher) {
  const query = issn ? `bibjson.eissn:${issn} OR bibjson.pissn:${issn}` : `bibjson.title:${JSON.stringify(title)}`;
  const url = `https://doaj.org/api/search/journals/${encodeURIComponent(query)}?pageSize=3`;
  return mapDoaj(await jsonFetch(url, fetcher));
}
export async function lookupOpenAlex({ issn, title }, fetcher) {
  const params = new URLSearchParams({ 'per-page': '5', mailto: CONTACT });
  if (issn) params.set('filter', `issn:${issn}`); else params.set('search', title);
  return mapOpenAlex(await jsonFetch(`https://api.openalex.org/sources?${params}`, fetcher));
}
export async function lookupCrossref({ issn, title }, fetcher) {
  const params = new URLSearchParams({ rows: '6', select: 'DOI,title,container-title,publisher,ISSN,published', mailto: CONTACT, sort: 'published', order: 'desc' });
  const url = issn ? `https://api.crossref.org/journals/${encodeURIComponent(issn)}/works?${params}` : `https://api.crossref.org/works?query.container-title=${encodeURIComponent(title)}&${params}`;
  return mapCrossref(await jsonFetch(url, fetcher), undefined, issn);
}
export async function lookupPlantWorks({ issn, title }, fetcher) {
  const params = new URLSearchParams({ search: `plant crop agriculture ${title || ''}`.trim(), 'per-page': '5', sort: 'publication_date:desc', mailto: CONTACT });
  if (issn) params.set('filter', `primary_location.source.issn:${issn}`);
  const data = await jsonFetch(`https://api.openalex.org/works?${params}`, fetcher);
  return (data.results || []).map(w => ({ title: w.display_name, year: w.publication_year, url: w.doi || w.id, topics: arr(w.topics).slice(0, 3).map(x => x.display_name) }));
}
