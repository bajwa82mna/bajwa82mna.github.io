import { normalizeIssn } from './issn.js?v=20';
import { STATUS, claim, sourceEvidence } from './schema.js?v=20';

export const normalizeText = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
export const normalizePublisher = value => {
  const normalized = normalizeText(String(value || '').replace(/\s*\([^)]{2,12}\)\s*$/g, ''));
  return new Map([['public library of science','plos'],['plos','plos'],['springer science and business media llc','springer nature'],['springer science business media','springer nature'],['springer science business media llc','springer nature'],['springer nature','springer nature']]).get(normalized) || normalized;
};
const values = (records, key) => records.map(r => r[key]).filter(Boolean);
const distinct = list => [...new Map(list.map(value => [normalizeText(value), value])).values()];
const allIssns = records => [...new Set(records.flatMap(r => r.issns || []).map(normalizeIssn).filter(Boolean))];

export function titleSimilarity(a, b) {
  const aa = new Set(normalizeText(a).split(' ').filter(Boolean));
  const bb = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (!aa.size || !bb.size) return 0;
  const common = [...aa].filter(x => bb.has(x)).length;
  return common / (aa.size + bb.size - common);
}

export function exactTitleMatch(records, title) {
  const key = normalizeText(title);
  return records.find(record => normalizeText(record.title) === key) || null;
}

export function findLocalSelection(records, title = '', issn = '') {
  const wanted = normalizeIssn(issn);
  return (wanted && records.find(record => (record.issns || []).map(normalizeIssn).includes(wanted))) || exactTitleMatch(records, title);
}

export function recordsForIdentity(records, query = {}) {
  const wantedIssns = new Set((query.issns || []).map(normalizeIssn).filter(Boolean));
  const wantedTitle = normalizeText(query.title);
  return records.filter(record => {
    const recordIssns = (record.issns || []).map(normalizeIssn).filter(Boolean);
    if (wantedIssns.size) return recordIssns.some(issn => wantedIssns.has(issn));
    return wantedTitle && normalizeText(record.title) === wantedTitle;
  });
}

export function reconcile(records, query = {}) {
  const active = records.filter(Boolean);
  const titles = distinct(values(active, 'title'));
  const publishers = distinct(values(active, 'publisher'));
  const issns = allIssns(active);
  const requestedIssns = (query.issns || []).map(normalizeIssn);
  const ev = (key) => active.filter(r => r[key]).map(r => sourceEvidence(r.source, r.url, r.retrievedAt, r[key]));
  const titleConflict = titles.length > 1 && titles.some((t, i) => titles.slice(i + 1).some(u => titleSimilarity(t, u) < .72));
  const publisherVariants = [...new Set(publishers.map(normalizePublisher).filter(Boolean))];
  const sourceIssnSets = active.map(r => new Set((r.issns || []).map(normalizeIssn).filter(Boolean))).filter(set => set.size);
  const sourceIssnConflict = sourceIssnSets.some((set, i) => sourceIssnSets.slice(i + 1).some(other => ![...set].some(issn => other.has(issn))));
  const issnMismatch = requestedIssns.length > 0 && !requestedIssns.some(i => issns.includes(i));
  const issnConflict = issnMismatch || sourceIssnConflict;
  const claims = [
    claim({ field: 'title', label: 'Journal title', value: titles[0] || query.title || null, status: titleConflict ? STATUS.conflicting : titles.length ? STATUS.confirmed : STATUS.absent, evidence: ev('title'), note: titleConflict ? `Sources report: ${titles.join(' · ')}` : '' }),
    claim({ field: 'issns', label: 'ISSNs', value: issns, status: issnConflict ? STATUS.conflicting : issns.length ? STATUS.confirmed : STATUS.absent, evidence: active.flatMap(r => (r.issns || []).length ? [sourceEvidence(r.source, r.url, r.retrievedAt, r.issns)] : []), note: issnMismatch ? 'The returned records do not contain the searched ISSN. Check for a title collision or identifier mismatch.' : sourceIssnConflict ? 'Sources returned disjoint ISSN sets for this journal identity.' : '' }),
    claim({ field: 'publisher', label: 'Publisher', value: publishers[0] || null, status: publishers.length ? STATUS.confirmed : STATUS.absent, evidence: ev('publisher'), note: publisherVariants.length > 1 ? `Publisher names vary across sources: ${publishers.join(' · ')}` : '' })
  ];
  const conflicts = claims.filter(c => c.status === STATUS.conflicting).map(c => c.note);
  return { identity: { title: titles[0] || query.title || '', issns, publishers }, claims, conflicts };
}

export function subjectFit(source = {}) {
  const terms = ['plant', 'crop', 'agricultur', 'botan', 'horticultur', 'forest', 'soil', 'genetic', 'breeding', 'ecolog', 'food'];
  const haystack = normalizeText([source.title, ...(source.subjects || []), ...(source.topics || [])].join(' '));
  return terms.filter(term => haystack.includes(term));
}
