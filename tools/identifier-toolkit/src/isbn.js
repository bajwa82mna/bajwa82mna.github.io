export function normalizeIsbn(value = '') {
  const compact = String(value).toUpperCase().replace(/^ISBN(?:-1[03])?\s*:?[ ]*/i, '').replace(/[^0-9X]/g, '');
  if (compact.length === 13) return `${compact.slice(0, 3)}-${compact.slice(3, 4)}-${compact.slice(4, 7)}-${compact.slice(7, 12)}-${compact.slice(12)}`;
  if (compact.length === 10) return `${compact.slice(0, 1)}-${compact.slice(1, 4)}-${compact.slice(4, 9)}-${compact.slice(9)}`;
  return compact;
}

export function validateIsbn(value) {
  const normalized = normalizeIsbn(value);
  const compact = normalized.replaceAll('-', '');
  if (/^\d{13}$/.test(compact)) {
    const sum = [...compact.slice(0, 12)].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
    const expected = String((10 - sum % 10) % 10);
    return {valid: compact[12] === expected, normalized, reason: compact[12] === expected ? '' : `Checksum mismatch: expected ${expected}.`};
  }
  if (/^\d{9}[\dX]$/.test(compact)) {
    const sum = [...compact].reduce((total, digit, index) => total + (digit === 'X' ? 10 : Number(digit)) * (10 - index), 0);
    const valid = sum % 11 === 0;
    return {valid, normalized, reason: valid ? '' : 'ISBN-10 checksum mismatch.'};
  }
  return {valid: false, normalized, reason: 'An ISBN has 10 or 13 digits; ISBN-10 may end in X.'};
}
