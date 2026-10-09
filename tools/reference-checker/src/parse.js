import { cleanRecord, normalizeDoi, validDoi } from './normalize.js?v=25';

export function extractDois(text = '') {
  const matches = text.match(/(?:https?:\/\/(?:dx\.)?doi\.org\/|doi\s*:\s*)?10\.\d{4,9}\/[^\s<>"']+/gi) || [];
  return [...new Set(matches.map(normalizeDoi).filter(validDoi))];
}

function parsePlainCitation(citation, index) {
  const match = citation.match(/^(.+?)\.\s+(.+?)\.\s+([^.;]+)\.\s+((?:19|20)\d{2})\s*;\s*([^:.;]+)(?::([^.;]+))?\.?$/);
  if (!match) {
    const simple = citation.match(/^(.+?)\.\s+(.+?)\.\s+((?:19|20)\d{2})\.?$/);
    if (!simple) return null;
    const author = simple[1].split(/\s*,\s*/).map(name => ({ family:name.trim().split(/\s+/)[0], literal:name.trim() }));
    return cleanRecord({ type:'article-journal', title:simple[2].trim(), author, issued:{'date-parts':[[Number(simple[3])]]}, _plain:true, _citation:citation }, index);
  }
  const [, authorText, title, journal, year, volumeIssue, pages] = match;
  const author = authorText.split(/\s*,\s*/).map(name => ({ family: name.trim().split(/\s+/)[0], literal: name.trim() })).filter(item => item.family);
  const volume = volumeIssue.trim().match(/^([^()\s]+)(?:\(([^)]+)\))?$/);
  return cleanRecord({ type:'article-journal', title:title.trim(), author, 'container-title':journal.trim(), issued:{'date-parts':[[Number(year)]]}, volume:volume?.[1], issue:volume?.[2], page:pages?.trim(), _plain:true, _citation:citation }, index);
}

export function parseInput(text, Cite) {
  const raw = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!raw) return { records: [], warnings: [], couldNotParse: [] };
  const warnings = [], couldNotParse = [];
  const structured = /^\s*(?:@|\{|\[|TY\s*-)/.test(raw);
  try {
    const data = new Cite(raw).data || [];
    if (structured && data.length) return { records: data.map(cleanRecord), warnings, couldNotParse };
  } catch (error) { warnings.push(`Structured parser: ${error.message || 'input not recognized'}`); }
  const lines = raw.split(/\n{1,}/).map(line => line.trim()).filter(Boolean);
  const records = [];
  lines.forEach((citation, lineIndex) => {
    const dois = extractDois(citation);
    if (dois.length) { dois.forEach(DOI => records.push(cleanRecord({ DOI, type:'article-journal' }, records.length))); return; }
    const parsed = parsePlainCitation(citation, records.length);
    if (parsed) records.push(parsed); else couldNotParse.push({ line:lineIndex + 1, text:citation });
  });
  if (records.some(record => record._plain)) warnings.push('Plain references were parsed without inventing identifiers; online title, author, and year search may return ambiguous matches.');
  if (couldNotParse.length) warnings.push(`${couldNotParse.length} line${couldNotParse.length === 1 ? '' : 's'} could not be parsed and are listed in the report.`);
  return { records, warnings, couldNotParse };
}
