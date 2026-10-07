export function normalizeDoi(value = '') {
  let doi = String(value).trim().replace(/^doi:\s*/i, '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
  try { doi = decodeURIComponent(doi); } catch {}
  doi = doi.trim().replace(/[.,;:]+$/, '');
  while (doi.endsWith(')') && (doi.match(/\(/g) || []).length < (doi.match(/\)/g) || []).length) doi = doi.slice(0, -1);
  return doi.toLowerCase();
}

export function validateDoi(value) {
  const normalized = normalizeDoi(value);
  const valid = /^10\.\d{4,9}\/\S+$/i.test(normalized);
  return { valid, normalized, reason: valid ? '' : 'A DOI must start with 10., contain a 4–9 digit registrant code, then / and a suffix.' };
}
