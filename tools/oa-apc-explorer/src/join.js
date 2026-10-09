import { cleanIssn } from './normalize.js?v=22';

export function joinByIssn(journals, sources) {
  const index = new Map();
  for (const source of sources) {
    for (const issn of source.issn || []) index.set(cleanIssn(issn), source);
    if (source.issn_l) index.set(cleanIssn(source.issn_l), source);
  }
  return journals.map(journal => {
    const keys = [journal.issnL, ...journal.issns].filter(Boolean);
    const match = keys.map(key => index.get(cleanIssn(key))).find(Boolean) || null;
    return {...journal, openAlex: match ? {
      id: match.id, worksCount: match.works_count ?? null,
      oaWorksCount: match.summary_stats?.oa_percent != null && match.works_count != null
        ? Math.round(match.works_count * match.summary_stats.oa_percent / 100) : null,
      oaPercent: match.summary_stats?.oa_percent ?? null,
      sourceUrl: match.id
    } : null};
  });
}
