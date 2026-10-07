export function dossierJson(profile) { return JSON.stringify(profile, null, 2); }
export function dossierFilename(profile) {
  const slug = (profile.identity?.title || 'journal').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${slug || 'journal'}-evidence-profile.json`;
}
