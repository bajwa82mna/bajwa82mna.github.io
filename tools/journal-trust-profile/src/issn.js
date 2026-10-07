export function normalizeIssn(value = '') {
  const compact = String(value).toUpperCase().replace(/^ISSN\s*/i, '').replace(/[^0-9X]/g, '');
  return compact.length === 8 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : compact;
}

export function isValidIssn(value) {
  const compact = normalizeIssn(value).replace('-', '');
  if (!/^[0-9]{7}[0-9X]$/.test(compact)) return false;
  const sum = [...compact].reduce((total, char, index) => total + (char === 'X' ? 10 : Number(char)) * (8 - index), 0);
  return sum % 11 === 0;
}

export function extractIssns(value = '') {
  return [...new Set((String(value).match(/\b\d{4}-?\d{3}[\dXx]\b/g) || []).map(normalizeIssn))];
}
