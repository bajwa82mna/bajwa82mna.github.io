import { plantRelated } from './normalize.js?v=23';

export function filterJournals(journals, options = {}) {
  const query = (options.query || '').trim().toLocaleLowerCase();
  return journals.filter(journal => {
    if (query && ![journal.title, journal.publisher, ...journal.issns].join(' ').toLocaleLowerCase().includes(query)) return false;
    if (options.plant && !plantRelated(journal)) return false;
    if (options.fee && journal.apcState !== options.fee) return false;
    if (options.waiver && journal.waiver !== 'present') return false;
    if (options.license && !journal.licenses.some(value => value.toLowerCase().includes(options.license.toLowerCase()))) return false;
    return true;
  });
}

export function sortJournals(journals, sort = 'title') {
  const firstFee = journal => journal.prices[0]?.amount ?? Infinity;
  return [...journals].sort((a, b) => sort === 'fee-asc'
    ? firstFee(a) - firstFee(b) || a.title.localeCompare(b.title)
    : sort === 'fee-desc' ? firstFee(b) - firstFee(a) || a.title.localeCompare(b.title)
      : a.title.localeCompare(b.title));
}
