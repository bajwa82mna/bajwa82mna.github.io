import { validateDoi } from './doi.js';
import { validateIssn } from './issn.js';
import { validateOrcid } from './orcid.js';

export function detectIdentifiers(input = '') {
  const text = String(input);
  const candidates = [];
  const patterns = [
    ['orcid', /(?:https?:\/\/(?:www\.)?orcid\.org\/)?\d{4}-\d{4}-\d{4}-[\dX]{4}/gi, validateOrcid],
    ['doi', /(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)?10\.\d{4,9}\/[^\s<>{}"']+/gi, validateDoi],
    ['issn', /(?:ISSN\s*)?\d{4}[\s-]?[\dX]{4}/gi, validateIssn]
  ];
  for (const [type, regex, validate] of patterns) {
    for (const match of text.matchAll(regex)) {
      let raw = match[0].replace(/^(?:DOI|ISSN)\s*:?\s*/i, '');
      const result = validate(raw);
      candidates.push({ type, raw, ...result, index: match.index });
    }
  }
  return candidates.sort((a, b) => a.index - b.index || b.raw.length - a.raw.length).filter((item, index, all) => !all.slice(0, index).some(previous => item.index >= previous.index && item.index + item.raw.length <= previous.index + previous.raw.length));
}
