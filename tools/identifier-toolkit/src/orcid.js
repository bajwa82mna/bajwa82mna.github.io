export function normalizeOrcid(value = '') {
  const compact = String(value).toUpperCase().replace(/^https?:\/\/(?:www\.)?orcid\.org\//i, '').replace(/^ORCID(?:\s+ID)?\s*:?\s*/i, '').replace(/[^0-9X]/g, '');
  return compact.length === 16 ? compact.match(/.{1,4}/g).join('-') : compact;
}

export function validateOrcid(value) {
  const normalized = normalizeOrcid(value);
  const compact = normalized.replaceAll('-', '');
  if (!/^\d{15}[\dX]$/.test(compact)) return { valid: false, normalized, reason: 'An ORCID iD has 16 characters; the last may be X.' };
  let total = 0;
  for (const digit of compact.slice(0, 15)) total = (total + Number(digit)) * 2;
  const remainder = total % 11;
  const result = (12 - remainder) % 11;
  const expected = result === 10 ? 'X' : String(result);
  const valid = compact[15] === expected;
  return { valid, normalized, reason: valid ? '' : `Checksum mismatch: expected ${expected}.` };
}
