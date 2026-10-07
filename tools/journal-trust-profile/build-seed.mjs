import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const sourcePath = new URL('../emerging-journals-2026/data.js', import.meta.url);
const outputPath = new URL('./data/journal-seed.min.json', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8');
const raw = vm.runInNewContext(`${source}\n;RAW`);
const seen = new Set();
const rows = raw.rows.flatMap(r => {
  const issns = [r[4], r[5]].filter(Boolean);
  const key = `${r[1].toLowerCase()}|${issns.join('|')}`;
  if (seen.has(key)) return [];
  seen.add(key);
  return [{ id: r[0], title: r[1], category: raw.cats[r[2]], quartile: r[3], issns }];
});
const json = JSON.stringify(rows);
fs.writeFileSync(outputPath, json);
const sha256 = crypto.createHash('sha256').update(json).digest('hex');
console.log(JSON.stringify({ records: rows.length, bytes: Buffer.byteLength(json), sha256 }, null, 2));
