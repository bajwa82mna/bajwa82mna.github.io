const MAILTO = 'contact@smbajwa.com';

export function buildLookupUrls(item) {
  const id = item.normalized;
  if (item.type === 'doi') {
    const encoded = encodeURIComponent(id);
    return {
      crossref: `https://api.crossref.org/works/${encoded}?mailto=${encodeURIComponent(MAILTO)}`,
      openalex: `https://api.openalex.org/works/https://doi.org/${encoded}?mailto=${encodeURIComponent(MAILTO)}`,
      resolver: `https://doi.org/${encoded}`
    };
  }
  if (item.type === 'issn') {
    const encoded = encodeURIComponent(id);
    return {
      crossref: `https://api.crossref.org/journals/${encoded}?mailto=${encodeURIComponent(MAILTO)}`,
      openalex: `https://api.openalex.org/sources/issn:${encoded}?mailto=${encodeURIComponent(MAILTO)}`,
      doaj: `https://doaj.org/api/search/journals/issn:${encoded}`
    };
  }
  if (item.type === 'orcid') return { record: `https://orcid.org/${encodeURIComponent(id)}` };
  return {};
}
