export async function loadLocale(baseUrl, language = 'en') {
  const supported = ['en', 'ur'];
  const code = supported.includes(language) ? language : 'en';
  const response = await fetch(`${baseUrl}/${code}.json`);
  if (!response.ok) throw new Error(`Locale ${code} could not be loaded.`);
  return response.json();
}

export function applyLocale(strings, root = document) {
  root.querySelectorAll('[data-i18n]').forEach(element => {
    const value = strings[element.dataset.i18n];
    if (typeof value === 'string') element.textContent = value;
  });
}
