const withoutAbstract = record => Object.fromEntries(Object.entries(record).filter(([key, value]) => key !== 'abstract' && value !== undefined && value !== ''));

export function exportRecords(records, format, Cite = globalThis.Cite) {
  const safe = records.map(withoutAbstract);
  if (format === 'json') return `${JSON.stringify(safe, null, 2)}\n`;
  if (format === 'csv') {
    const cell = value => { const text = String(value ?? ''); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; };
    return ['DOI,title,publisher,year', ...safe.map(record => [record.DOI, record.title, record.publisher, record.issued?.['date-parts']?.[0]?.[0]].map(cell).join(','))].join('\r\n') + '\r\n';
  }
  if (!Cite) throw new Error('Citation.js is unavailable. Reload the page and try again.');
  const cite = new Cite(safe);
  if (format === 'bibtex') return cite.format('bibtex');
  if (format === 'ris') return cite.format('ris');
  return cite.format('bibliography', { format: 'text', template: format || 'apa', lang: 'en-US' });
}
