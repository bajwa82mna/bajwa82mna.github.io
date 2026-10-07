import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const sourcePath = new URL('../emerging-journals-2026/data.js', import.meta.url);
const outputPath = new URL('./data/journal-seed.min.json', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8');
const raw = vm.runInNewContext(`${source}\n;RAW`);
const validIssn = value => {
  const compact = String(value || '').toUpperCase().replace(/[^0-9X]/g, '');
  if (!/^[0-9]{7}[0-9X]$/.test(compact)) return false;
  return [...compact].reduce((sum, char, index) => sum + (char === 'X' ? 10 : Number(char)) * (8 - index), 0) % 11 === 0;
};
const seen = new Set();
const rows = raw.rows.flatMap(r => {
  const issns = [r[4], r[5]].filter(validIssn), key = `${r[1].toLowerCase()}|${issns.join('|')}`;
  if (seen.has(key)) return [];
  seen.add(key);
  return [{ id: `${r[2]}-${r[0]}`, title: r[1], category: raw.cats[r[2]], quartile: r[3], issns }];
});
const json = JSON.stringify(rows);
fs.writeFileSync(outputPath, json);
const sha256 = crypto.createHash('sha256').update(json).digest('hex');
const manifestPath = new URL('./data/data-manifest.json', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
Object.assign(manifest, { generated: new Date().toISOString().slice(0, 10), records: rows.length, sha256 });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ records: rows.length, bytes: Buffer.byteLength(json), sha256 }, null, 2));
