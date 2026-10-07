export const MAX_COMPARE = 4;
export function toggleComparison(ids, id) {
  if (ids.includes(id)) return ids.filter(value => value !== id);
  return ids.length >= MAX_COMPARE ? ids : [...ids, id];
}
export function comparisonRows(journals, ids) {
  return ids.map(id => journals.find(journal => String(journal.id) === String(id))).filter(Boolean);
}
