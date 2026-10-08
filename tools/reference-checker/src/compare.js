import { authorFamilies, normalizeText, titleTokens, yearOf } from './normalize.js?v=18';

export function similarity(a, b) {
  const left = titleTokens(a), right = titleTokens(b); if (!left.size && !right.size) return 1;
  const intersection = [...left].filter(x => right.has(x)).length, union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

export function compareRecords(local, remote) {
  const findings = [], titleScore = similarity(local.title, remote.title);
  if (local.title && remote.title && titleScore < .78) findings.push({ severity: titleScore < .45 ? 'failure' : 'discrepancy', field: 'title', message: `Title differs (${Math.round(titleScore * 100)}% token overlap).`, expected: local.title, returned: remote.title });
  const localYear = yearOf(local), remoteYear = yearOf(remote);
  if (localYear && remoteYear && Number(localYear) !== Number(remoteYear)) findings.push({ severity: Math.abs(localYear - remoteYear) > 1 ? 'discrepancy' : 'advisory', field: 'year', message: `Year differs: local ${localYear}; source ${remoteYear}.`, expected: localYear, returned: remoteYear });
  const localAuthors = authorFamilies(local), remoteAuthors = authorFamilies(remote);
  if (localAuthors.length && remoteAuthors.length && !localAuthors.some(name => remoteAuthors.includes(name))) findings.push({ severity: 'discrepancy', field: 'authors', message: 'No normalized family-name overlap.', expected: localAuthors.join(', '), returned: remoteAuthors.join(', ') });
  if (!local.DOI) findings.push({ severity: 'advisory', field: 'DOI', message: 'No DOI was supplied; a title search is less conclusive.' });
  for (const field of ['title', 'author']) if (!local[field]?.length) findings.push({ severity: 'advisory', field, message: `Local ${field} metadata is missing.` });
  return findings;
}

export function plantWarnings(record) {
  const value = `${record.title || ''} ${(record.author || []).map(a => a.family || '').join(' ')}`;
  const findings = [];
  if (/\b(?:cv\.|cultivar|var\.)\s+[A-Z][\p{L}-]+/u.test(value)) findings.push({ severity: 'advisory', field: 'plant name', message: 'Cultivar/variety styling detected; compare capitalization and italics with the source.' });
  if (/\b[A-Z][a-z]+\s+[a-z]{2,}\b/u.test(value)) findings.push({ severity: 'advisory', field: 'species name', message: 'A possible binomial name was detected; formatting differences may be meaningful.' });
  if (/\b[A-Z]{2,}\d*[A-Z]*\b/.test(value)) findings.push({ severity: 'advisory', field: 'gene symbol', message: 'Uppercase gene-like text detected; case was preserved and should be checked manually.' });
  return findings;
}
