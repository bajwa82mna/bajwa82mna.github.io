export function toCsv(results, settings) {
  const esc=v=>`"${String(v??"").replaceAll('"','""')}"`;
  const rows=[["rank","journal","issn","publisher","category","open_access","apc_declared","fit_score","matched_terms","retrieved"]];
  results.forEach((r,i)=>rows.push([i+1,r.profile.title,r.profile.issn,r.profile.publisher,r.profile.category,r.profile.oa,r.profile.apc,Number(r.score).toFixed(3),r.explanation.direct.join("; "),settings.retrieved]));
  return rows.map(row=>row.map(esc).join(",")).join("\n");
}

export function download(name, content, type="text/plain") {
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
