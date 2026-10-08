export function createPrivacyNotice({ local = [], online = [], storage = 'No local persistence unless you opt in.' }) {
  const row = document.createElement('p');
  row.className = 'privacy-chip';
  const link = document.createElement('a');
  link.href = '/tools/privacy-and-sources/';
  link.textContent = 'Local analysis; public sources are contacted only after you approve a lookup — privacy and sources';
  row.append(link);
  return row;
}

export function confirmLookup(domains) {
  return window.confirm(`This lookup will send only the selected identifier to:\n\n${domains.join('\n')}\n\nContinue?`);
}
