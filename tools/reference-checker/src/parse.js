import { cleanRecord, normalizeDoi, validDoi } from './normalize.js?v=8';

export function extractDois(text = '') {
  const matches = text.match(/(?:https?:\/\/(?:dx\.)?doi\.org\/|doi\s*:\s*)?10\.\d{4,9}\/[^\s<>"']+/gi) || [];
  return [...new Set(matches.map(normalizeDoi).filter(validDoi))];
}

export function parseInput(text, Cite) {
  const raw = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!raw) return { records: [], warnings: [] };
  const warnings = [];
  try {
    const data = new Cite(raw).data || [];
    if (data.length) return { records: data.map(cleanRecord), warnings };
  } catch (error) { warnings.push(`Structured parser: ${error.message || 'input not recognized'}`); }
  const dois = extractDois(raw);
  if (dois.length) return { records: dois.map((DOI, index) => cleanRecord({ DOI, type: 'article-journal' }, index)), warnings };
  const lines = raw.split(/\n{1,}/).map(line => line.trim()).filter(Boolean);
  const records = lines.map((citation, index) => {
    const year = citation.match(/\b(19|20)\d{2}[a-z]?\b/i)?.[0]?.slice(0, 4);
    return cleanRecord({ type: 'article-journal', title: citation, issued: year ? { 'date-parts': [[Number(year)]] } : undefined, _plain: true }, index);
  });
  warnings.push('Plain references were kept as entered; online title search may return ambiguous matches. Add DOIs where possible.');
  return { records, warnings };
}
