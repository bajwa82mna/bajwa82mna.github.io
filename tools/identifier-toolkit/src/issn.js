export function normalizeIssn(value = '') {
  const compact = String(value).toUpperCase().replace(/^ISSN\s*/i, '').replace(/[^0-9X]/g, '');
  return compact.length === 8 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : compact;
}

export function validateIssn(value) {
  const normalized = normalizeIssn(value);
  const compact = normalized.replace('-', '');
  if (!/^\d{7}[\dX]$/.test(compact)) return { valid: false, normalized, reason: 'An ISSN has eight characters; the last may be X.' };
  const total = [...compact.slice(0, 7)].reduce((sum, digit, index) => sum + Number(digit) * (8 - index), 0);
  const check = (11 - (total % 11)) % 11;
  const expected = check === 10 ? 'X' : String(check);
  const valid = compact[7] === expected;
  return { valid, normalized, reason: valid ? '' : `Checksum mismatch: expected ${expected}.` };
}
