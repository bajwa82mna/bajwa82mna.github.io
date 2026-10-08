import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=f=>fs.readFileSync(new URL(`../${f}`,import.meta.url),'utf8');
test('page makes experimental scope, privacy and limits visible',()=>{
  const html=read('index.html');
  for(const text of ['Variant Toolkit','Experimental','2 MB','stays in your browser','not HGVS','Ensembl Plants VEP','fastVEP','Frequently asked questions','Related tools']) assert.match(html,new RegExp(text,'i'),text);
  assert.match(html,/role="tablist"/);
  assert.doesNotMatch(html,/<script(?![^>]+src=|[^>]+type="application\/ld\+json")/);
});
