function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
export function exportReport(report, format = 'json') {
  if (format === 'json') return JSON.stringify(report, null, 2);
  if (format === 'csv') {
    const rows = [['index','identifier','title','authors','year','journal','volume','issue','pages','status','findings','updates','sources','retrieved']];
    report.records.forEach((r, i) => rows.push([i + 1, r.local.DOI || 'no identifier', r.local.title || '', (r.local.author || []).map(a => a.family || a.literal).filter(Boolean).join('; '), r.local.issued?.['date-parts']?.[0]?.[0] || '', r.local['container-title'] || '', r.local.volume || '', r.local.issue || '', r.local.page || '', r.status, r.findings.map(f => `${f.severity}: ${f.message}`).join(' | '), r.updates.map(u => u.label).join(' | '), r.sources.map(s => s.name).join(' | '), r.retrievedAt || '']));
    return rows.map(row => row.map(csvCell).join(',')).join('\n');
  }
  const lines = ['# Reference integrity audit', '', `Generated: ${report.generatedAt}`, '', '> No alert found means only that no matching alert was returned by the queried sources; it is not proof of integrity.', ''];
  report.records.forEach((r, i) => { lines.push(`## ${i + 1}. ${r.local.title || r.local.DOI || 'Untitled record'}`, '', `- Status: ${r.status}`, `- DOI: ${r.local.DOI || 'not supplied'}`, `- Sources: ${r.sources.map(s => `${s.name} (${s.status})`).join(', ') || 'not checked'}`); r.findings.forEach(f => lines.push(`- ${f.severity}: ${f.message}`)); r.updates.forEach(u => lines.push(`- ${u.severity}: ${u.label} — ${u.source}`)); lines.push(''); });
  return lines.join('\n');
}
