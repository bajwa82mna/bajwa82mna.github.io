import { validateDoi } from './doi.js?v=21';
import { validateIssn } from './issn.js?v=21';
import { validateOrcid } from './orcid.js?v=21';
import { validateIsbn } from './isbn.js?v=21';

export function detectIdentifiers(input = '') {
  const text = String(input);
  const candidates = [];
  const patterns = [
    ['orcid', /(?:https?:\/\/(?:www\.)?orcid\.org\/)?\d{4}-\d{4}-\d{4}-[\dX]{4}/gi, validateOrcid],
    ['doi', /(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)?10\.\d{4,9}\/[^\s<>{}"']+/gi, validateDoi],
    ['isbn', /(?:ISBN(?:-1[03])?\s*:?\s*(?:97[89][ -]?)?\d[\d -]{7,15}[\dX]|\b(?:97[89](?:[ -]\d+){4}|97[89]\d{10}|\d(?:[ -]\d+){3}|\d{9}[\dX])\b)/gi, validateIsbn],
    ['issn', /(?:ISSN\s*)?\d{4}[\s-]?[\dX]{4}/gi, validateIssn]
  ];
  for (const [type, regex, validate] of patterns) {
    for (const match of text.matchAll(regex)) {
      let raw = match[0].replace(/^(?:DOI|ISSN|ISBN(?:-1[03])?)\s*:?\s*/i, '');
      const result = validate(raw);
      candidates.push({ type, raw, ...result, index: match.index });
    }
  }
  return candidates.sort((a, b) => a.index - b.index || b.raw.length - a.raw.length).filter((item, index, all) => !all.slice(0, index).some(previous => item.index >= previous.index && item.index + item.raw.length <= previous.index + previous.raw.length));
}
