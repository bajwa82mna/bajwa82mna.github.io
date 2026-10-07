import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import { isValidIssn } from '../../src/issn.js';

const root = new URL('../../', import.meta.url);
const source = fs.readFileSync(new URL('../emerging-journals-2026/data.js', root), 'utf8');
const raw = vm.runInNewContext(`${source}\n;RAW`);
const seedText = fs.readFileSync(new URL('data/journal-seed.min.json', root), 'utf8');
const seed = JSON.parse(seedText);
const manifest = JSON.parse(fs.readFileSync(new URL('data/data-manifest.json', root), 'utf8'));

test('seed identifiers and ISSNs are valid and unique', () => {
  assert.equal(new Set(seed.map(row => row.id)).size, seed.length);
  for (const row of seed) for (const issn of row.issns) assert.ok(isValidIssn(issn), `${row.title}: ${issn}`);
});

test('seed is an exact current projection of data.js and matches its manifest', () => {
  const seen = new Set();
  const expected = JSON.parse(JSON.stringify(raw.rows.flatMap(row => { const issns=[row[4],row[5]].filter(isValidIssn),key=`${row[1].toLowerCase()}|${issns.join('|')}`; if(seen.has(key))return [];seen.add(key);return [{ id: `${row[2]}-${row[0]}`, title: row[1], category: raw.cats[row[2]], quartile: row[3], issns }]; })));
  assert.deepEqual(seed, expected);
  assert.equal(manifest.records, seed.length);
  assert.equal(manifest.sha256, crypto.createHash('sha256').update(seedText).digest('hex'));
});
