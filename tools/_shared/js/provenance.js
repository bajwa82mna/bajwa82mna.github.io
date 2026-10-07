export function provenanceRecord({ source, url, status, retrievedAt = new Date().toISOString() }) {
  return { source, url, status, retrievedAt };
}

export function renderProvenance(record) {
  const time = document.createElement('time');
  time.dateTime = record.retrievedAt;
  time.textContent = new Date(record.retrievedAt).toLocaleString();
  const link = document.createElement('a');
  link.href = record.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = record.source;
  const span = document.createElement('span');
  span.append(link, ` · ${record.status} · `, time);
  return span;
}
