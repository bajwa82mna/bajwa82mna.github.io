export function dossierJson(profile) { return JSON.stringify(profile, null, 2); }
export function dossierCsv(profile) { const cell=value=>{const text=Array.isArray(value)?value.join('; '):String(value??'');return /[",\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text}; const rows=[['field','value'],['title',profile.identity?.title],['issns',profile.identity?.issns],['publishers',profile.identity?.publishers],['generated_at',profile.generatedAt]]; return rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n'; }
export function dossierFilename(profile) {
  const slug = (profile.identity?.title || 'journal').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${slug || 'journal'}-evidence-profile.json`;
}
