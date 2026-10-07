export function decodeEntities(value = '') {
  return String(value)
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([\da-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
}

export function normalizeDoi(value = '') {
  let text = decodeEntities(String(value)).trim();
  try { text = decodeURIComponent(text); } catch {}
  text = text.replace(/^doi\s*:\s*/i, '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').trim();
  text = text.replace(/[.,;:]+$/g, '');
  while (text.endsWith(')') && (text.match(/\)/g) || []).length > (text.match(/\(/g) || []).length) text = text.slice(0, -1);
  return text.toLowerCase();
}

export function validDoi(value) { return /^10\.\d{4,9}\/\S+$/i.test(normalizeDoi(value)); }
export function normalizeText(value = '') { return decodeEntities(String(value)).normalize('NFKC').toLowerCase().replace(/<[^>]*>/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' '); }
export function titleTokens(value = '') { return new Set(normalizeText(value).split(' ').filter(word => word.length > 2)); }
export function yearOf(record = {}) { return record.issued?.['date-parts']?.[0]?.[0] || record.published?.['date-parts']?.[0]?.[0] || record.year || null; }
export function authorFamilies(record = {}) { return (record.author || []).map(a => normalizeText(a.family || a.literal || a.name || '')).filter(Boolean); }
export function cleanRecord(record = {}, index = 0) {
  const DOI = normalizeDoi(record.DOI || record.doi || '');
  return { ...record, id: record.id || DOI || `local-${index + 1}`, DOI: DOI || undefined, title: Array.isArray(record.title) ? record.title[0] : record.title, abstract: undefined, _index: index };
}
