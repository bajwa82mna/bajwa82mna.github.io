export function createPrivacyNotice({ local = [], online = [], storage = 'No local persistence unless you opt in.' }) {
  const aside = document.createElement('aside');
  aside.className = 'privacy-card';
  aside.setAttribute('aria-labelledby', 'privacy-heading');
  const heading = document.createElement('h2');
  heading.id = 'privacy-heading';
  heading.textContent = 'Privacy and network use';
  const localText = document.createElement('p');
  localText.textContent = `Stays in this browser: ${local.join(', ')}.`;
  const onlineText = document.createElement('p');
  onlineText.textContent = `Sent only when you choose an online lookup: ${online.join(', ')}.`;
  const storageText = document.createElement('p');
  storageText.textContent = storage;
  aside.append(heading, localText, onlineText, storageText);
  return aside;
}

export function confirmLookup(domains) {
  return window.confirm(`This lookup will send only the selected identifier to:\n\n${domains.join('\n')}\n\nContinue?`);
}
