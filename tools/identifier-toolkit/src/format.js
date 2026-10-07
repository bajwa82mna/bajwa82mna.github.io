import { normalizeDoi } from './doi.js?v=8';

const stripMarkup = value => String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const cleanAuthors = authors => (authors || []).map(author => ({ given: stripMarkup(author.given), family: stripMarkup(author.family) })).filter(author => author.given || author.family);

export function crossrefToCsl(message = {}) {
  return {
    id: normalizeDoi(message.DOI || message.URL || '') || message.DOI,
    type: message.type || 'article-journal',
    DOI: normalizeDoi(message.DOI || ''),
    title: stripMarkup(Array.isArray(message.title) ? message.title[0] : message.title),
    author: cleanAuthors(message.author),
    issued: message.issued || message.published || undefined,
    'container-title': stripMarkup(Array.isArray(message['container-title']) ? message['container-title'][0] : message['container-title']),
    volume: stripMarkup(message.volume),
    issue: stripMarkup(message.issue),
    page: stripMarkup(message.page),
    publisher: stripMarkup(message.publisher),
    ISSN: Array.isArray(message.ISSN) ? message.ISSN.slice() : undefined,
    URL: message.URL || (message.DOI ? `https://doi.org/${normalizeDoi(message.DOI)}` : undefined)
  };
}

export function openAlexToCsl(work = {}) {
  return {
    id: work.id || normalizeDoi(work.doi || ''),
    type: 'article-journal',
    DOI: normalizeDoi(work.doi || ''),
    title: stripMarkup(work.title || work.display_name),
    author: (work.authorships || []).map(item => {
      const name = stripMarkup(item.author?.display_name).split(/\s+/);
      return { given: name.slice(0, -1).join(' '), family: name.at(-1) || '' };
    }),
    issued: work.publication_year ? { 'date-parts': [[work.publication_year]] } : undefined,
    'container-title': stripMarkup(work.primary_location?.source?.display_name),
    URL: work.doi || work.id
  };
}

const year = record => record?.issued?.['date-parts']?.[0]?.[0] || null;
export function compareMetadata(primary = {}, secondary = {}) {
  const differences = [];
  if ((primary.title || '').toLocaleLowerCase() !== (secondary.title || '').toLocaleLowerCase()) differences.push({ field: 'title', primary: primary.title || 'Missing', secondary: secondary.title || 'Missing' });
  if (year(primary) !== year(secondary)) differences.push({ field: 'year', primary: year(primary) || 'Missing', secondary: year(secondary) || 'Missing' });
  return differences;
}
