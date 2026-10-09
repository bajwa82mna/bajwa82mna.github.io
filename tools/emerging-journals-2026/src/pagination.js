export const PAGE_SIZE = 12;

export function paginationState(total, batches = 1, pageSize = PAGE_SIZE) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeBatches = Math.max(1, Math.floor(Number(batches) || 1));
  const shown = Math.min(safeTotal, safeBatches * pageSize);
  return {
    shown,
    hasMore: shown < safeTotal,
    nextCount: Math.min(pageSize, safeTotal - shown),
    status: safeTotal ? `Showing ${shown.toLocaleString()} of ${safeTotal.toLocaleString()} journals` : "0 journals found",
  };
}
