export function cleanIssn(value = '') {
  const compact = String(value).toUpperCase().replace(/[^0-9X]/g, '');
  return compact.length === 8 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : '';
}

export function validIssn(value) {
  const compact = cleanIssn(value).replace('-', '');
  if (compact.length !== 8) return false;
  const sum = [...compact].reduce((total, character, index) => {
    const number = character === 'X' ? 10 : Number(character);
    return total + number * (8 - index);
  }, 0);
  return sum % 11 === 0;
}

export function normalizeJournal(raw = {}) {
  const bib = raw.bibjson || raw;
  const array = value => Array.isArray(value) ? value : value == null || value === '' ? [] : [value];
  const identifiers = Array.isArray(bib.identifier) ? bib.identifier : [];
  const issns = [...new Set([
    ...array(bib.issns || bib.issn), ...array(bib.pissn), ...array(bib.eissn),
    ...identifiers.filter(item => /issn/i.test(item.type || '')).map(item => item.id)
  ].map(cleanIssn).filter(Boolean))];
  const apc = bib.apc || {};
  const prices = array(apc.max || apc.amount || apc.charges || bib.apc_amount).map(item => ({
    amount: Number(item.price ?? item.amount), currency: String(item.currency || '').toUpperCase()
  })).filter(item => Number.isFinite(item.amount) && item.amount >= 0 && /^[A-Z]{3}$/.test(item.currency)) || [];
  const licenses = array(bib.license).map(item => item.type || item.title || item).filter(Boolean);
  const subjects = array(bib.subject).map(item => item.term || item.name || item).filter(Boolean);
  const waiver = apc.has_waiver ?? apc.waiver ?? bib.waiver;
  const declared = apc.has_apc ?? apc.has_apcs ?? bib.has_apc;
  return {
    id: raw.id || bib.id || issns[0] || bib.title,
    title: bib.title || raw.display_name || 'Untitled journal',
    publisher: bib.publisher?.name || bib.publisher || raw.host_organization_name || 'Not reported',
    issns,
    issnL: cleanIssn(raw.issn_l || bib.issn_l),
    subjects,
    licenses,
    copyright: bib.author_copyright || bib.copyright || null,
    prices,
    apcState: declared === false || (declared == null && prices.some(item => item.amount === 0)) ? 'none' : prices.length ? 'amount' : 'unknown',
    waiver: waiver === true ? 'present' : waiver === false ? 'not-reported' : 'unknown',
    source: 'DOAJ', sourceUrl: raw.id ? `https://doaj.org/toc/${encodeURIComponent(raw.id)}` : 'https://doaj.org/',
    retrievedAt: raw._retrievedAt || new Date().toISOString(),
    openAlex: null
  };
}

export function plantRelated(journal) {
  return /plant|agricultur|crop|botan|horticultur|forest|soil|agronom|seed|weed|phyt|food/i.test([journal.title, ...journal.subjects].join(' '));
}
