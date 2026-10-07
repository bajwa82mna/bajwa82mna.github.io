import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const metrics=fs.readFileSync(path.join(root,'metrics.js'),'utf8');

test('bulk enrichment and lazy trends remain wired into the page',()=>{
  assert.match(html,/src="data-extra\.js/);
  assert.match(app,/trends\/trends-/);
  assert.doesNotMatch(html,/data-trends\.js/);
  assert.match(html,/src="metrics\.js/);
  assert.match(html,/href="enhancements\.css/);
});

test('trend chunks resolve the requested journal row',()=>{
  const row=11140, chunk=Math.floor(row*24/22281), file=path.join(root,'trends',`trends-${chunk}.js`);
  const source=fs.readFileSync(file,'utf8');
  const payload=JSON.parse(source.match(/window\.TREND_CHUNKS\[\d+\]=(.*);\s*$/s)[1]);
  assert.ok(Object.hasOwn(payload.openalex,String(row)));
});

test('OpenAlex false and unmatched rows have distinct OA labels',()=>{
  assert.match(app,/Not fully OA \(OpenAlex\)/);
  assert.match(app,/OA status unavailable/);
});

test('finder tabs implement roving tabindex and keyboard navigation',()=>{
  for(const attr of ['aria-controls','aria-labelledby','tabIndex'])assert.match(app,new RegExp(attr));
  for(const key of ['ArrowLeft','ArrowRight','Home','End'])assert.match(app,new RegExp(key));
});

test('each journal card offers a safe SCImago ISSN lookup without bundled SJR data',()=>{
  assert.match(app,/https:\/\/www\.scimagojr\.com\/journalsearch\.php\?q=/);
  assert.match(app,/tip=iss/);
  assert.match(app,/SJR on SCImago ↗/);
  assert.doesNotMatch(metrics,/SJR \(SCImago\)|sjr-trend|sjr-metric/i);
});

test('citation sorting is labelled with its exact source and window',()=>{
  assert.match(html,/<option value="citation">Citation score \(2-yr, OpenAlex\)<\/option>/);
});

test('details retain live OpenAlex refresh with cache and rate-limit fallback',()=>{
  assert.match(app,/Refresh live OpenAlex/);
  assert.match(app,/localStorage/);
  assert.match(app,/429/);
  assert.match(app,/cached/i);
});

test('citation trend avoids misleading year-over-year percentage',()=>{
  assert.doesNotMatch(app,/citations per paper[^\n]*% vs previous year/);
  assert.match(app,/Recent years are lower because newer papers have had less time to be cited\./);
  assert.doesNotMatch(metrics,/% vs previous year/);
});

test('external links are safe and tracking scripts are absent',()=>{
  for(const [anchor] of html.matchAll(/<a\b[^>]*href="https?:\/\/[^>]+>/g)){
    assert.match(anchor,/target="_blank"/);
    assert.match(anchor,/rel="noopener noreferrer"/);
  }
  assert.doesNotMatch(html,/googletagmanager|google-analytics|segment\.com|mixpanel/i);
});
