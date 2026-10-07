const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
export function toCsv(journals) {
  const rows = [['Journal','Publisher','ISSNs','APC state','Declared fees','Waiver information','Licenses','Source','Retrieved']];
  for (const journal of journals) rows.push([
    journal.title, journal.publisher, journal.issns.join('; '), journal.apcState,
    journal.prices.map(item => `${item.amount} ${item.currency}`).join('; '), journal.waiver,
    journal.licenses.join('; '), journal.sourceUrl, journal.retrievedAt
  ]);
  return rows.map(row => row.map(quote).join(',')).join('\n');
}
export function toJson(journals) { return JSON.stringify({exportedAt: new Date().toISOString(), disclaimer: 'Fee declarations are not publisher quotes. Confirm before submission.', journals}, null, 2); }
