export function openAlexSourceTarget(row = [], extra = []) {
  const compact = String(row[4] || row[5] || '').toUpperCase().replace(/[^0-9X]/g, '');
  if (compact.length === 8) return `issn:${compact.slice(0, 4)}-${compact.slice(4)}`;
  return extra[8] || '';
}

export function openAlexSourceUrl(target) {
  const path = target.startsWith('issn:') ? `issn:${encodeURIComponent(target.slice(5))}` : encodeURIComponent(target);
  return `https://api.openalex.org/sources/${path}`;
}
