export function calculateBudget({amount, articles = 1, waiverPercent = 0, taxPercent = 0, uncertaintyPercent = 0, rate = 1}) {
  const values = [amount, articles, waiverPercent, taxPercent, uncertaintyPercent, rate].map(Number);
  if (values.some(value => !Number.isFinite(value)) || amount < 0 || articles < 1 || rate <= 0) throw new Error('Budget inputs must be finite and non-negative; articles and rate must be positive.');
  const base = amount * articles * (1 - Math.min(100, Math.max(0, waiverPercent)) / 100);
  const taxed = base * (1 + Math.max(0, taxPercent) / 100);
  const spread = taxed * Math.max(0, uncertaintyPercent) / 100;
  return {base, expected: taxed, low: Math.max(0, taxed - spread), high: taxed + spread, converted: {low: Math.max(0, taxed - spread) * rate, expected: taxed * rate, high: (taxed + spread) * rate}};
}
