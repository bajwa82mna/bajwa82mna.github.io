import { normalizeText } from './normalize.js?v=22';
import { similarity } from './compare.js?v=22';

export function findDuplicates(records) {
  const groups = [];
  for (let i = 0; i < records.length; i++) for (let j = i + 1; j < records.length; j++) {
    const a = records[i], b = records[j];
    const sameDoi = a.DOI && b.DOI && a.DOI === b.DOI;
    const titleScore = similarity(a.title, b.title);
    if (sameDoi || (normalizeText(a.title).length > 20 && titleScore >= .88)) groups.push({ indexes: [i, j], reason: sameDoi ? 'Same normalized DOI' : `Similar titles (${Math.round(titleScore * 100)}%)` });
  }
  return groups;
}
