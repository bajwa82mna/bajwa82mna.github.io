export function formatMoney(amount, currency, locale = undefined) {
  if (!Number.isFinite(Number(amount))) return 'Unknown';
  try { return new Intl.NumberFormat(locale, {style: 'currency', currency, maximumFractionDigits: 2}).format(amount); }
  catch { return `${Number(amount).toFixed(2)} ${currency}`; }
}
export function convert(amount, rate) {
  const result = Number(amount) * Number(rate);
  if (!Number.isFinite(result)) throw new Error('A valid amount and exchange rate are required.');
  return result;
}
