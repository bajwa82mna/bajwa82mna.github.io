const withoutAbstract = record => Object.fromEntries(Object.entries(record).filter(([key, value]) => key !== 'abstract' && value !== undefined && value !== ''));

export function exportRecords(records, format, Cite = globalThis.Cite) {
  const safe = records.map(withoutAbstract);
  if (format === 'json') return `${JSON.stringify(safe, null, 2)}\n`;
  if (!Cite) throw new Error('Citation.js is unavailable. Reload the page and try again.');
  const cite = new Cite(safe);
  if (format === 'bibtex') return cite.format('bibtex');
  if (format === 'ris') return cite.format('ris');
  return cite.format('bibliography', { format: 'text', template: format || 'apa', lang: 'en-US' });
}
