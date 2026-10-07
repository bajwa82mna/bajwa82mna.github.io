const LABELS = { retraction: 'Retraction', correction: 'Correction', erratum: 'Correction / erratum', 'expression of concern': 'Expression of concern', reinstatement: 'Reinstatement', update: 'Update' };
export function classifyUpdates(message = {}) {
  const seen = new Set(), results = [];
  for (const item of message['update-to'] || []) {
    const rawType = String(item.type || 'update').toLowerCase();
    const type = Object.keys(LABELS).find(key => rawType.includes(key)) || 'update';
    const key = `${type}|${item.DOI || ''}|${item.label || ''}`.toLowerCase(); if (seen.has(key)) continue; seen.add(key);
    results.push({ type, label: LABELS[type], doi: item.DOI || null, source: item.source || item.label || 'Crossref / Retraction Watch', updated: item.updated?.['date-time'] || item.updated?.['date-parts']?.[0]?.join('-') || null, severity: ['retraction', 'expression of concern'].includes(type) ? 'failure' : type === 'reinstatement' ? 'advisory' : 'discrepancy' });
  }
  return results;
}
