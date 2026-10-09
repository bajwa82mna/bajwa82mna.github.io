import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve('.');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const retired = [
  ['emerging-journals-2026', '/tools/journal-hub/?mode=trends'],
  ['journal-trust-profile', '/tools/journal-hub/?mode=check'],
  ['oa-apc-explorer', '/tools/journal-hub/?mode=apc'],
  ['abstract-journal-matcher', '/tools/journal-hub/?mode=match'],
  ['journal-timing', '/tools/journal-hub/?mode=timing'],
  ['reference-checker', '/tools/publishing-toolkit/?mode=references'],
  ['identifier-toolkit', '/tools/publishing-toolkit/?mode=identifiers'],
];

test('retired tool URLs are noindex full mounts with the shared redirect gate', () => {
  for (const [slug, target] of retired) {
    const html = read(`tools/${slug}/index.html`);
    assert.match(html, /name="robots" content="noindex,follow"/);
    assert.match(html, /legacy-redirect\.js\?v=23/);
    assert.match(html, /app\.js\?v=23/);
    assert.ok(target);
  }
});

test('every legacy redirect preserves the global safe parameters and validates example', () => {
  const js = read('tools/_shared/js/legacy-redirect.js');
  const routes=['journal-trust-profile','oa-apc-explorer','abstract-journal-matcher','journal-timing','emerging-journals-2026','reference-checker','identifier-toolkit','dilution-calculator','qpcr-ddct-calculator','reverse-complement'];
  for(const slug of routes){
    let replaced='';
    const href=`https://smbajwa.com/tools/${slug}/?q=A%2BB%20C&journal=J%26K&example=1`;
    vm.runInNewContext(js,{URL,location:{href,origin:'https://smbajwa.com',replace:value=>{replaced=value}}});
    const target=new URL(replaced,'https://smbajwa.com');
    assert.equal(target.searchParams.get('q'),'A+B C',`${slug}: q`);
    assert.equal(target.searchParams.get('journal'),'J&K',`${slug}: journal`);
    assert.equal(target.searchParams.get('example'),'1',`${slug}: example`);
    let invalid='';
    vm.runInNewContext(js,{URL,location:{href:`https://smbajwa.com/tools/${slug}/?example=2`,origin:'https://smbajwa.com',replace:value=>{invalid=value}}});
    assert.equal(new URL(invalid,'https://smbajwa.com').searchParams.has('example'),false,`${slug}: invalid example`);
  }
  // Plant Lab destinations intentionally ignore q and journal, but migration preserves them.
});

test('retired shells consolidate canonical, Open Graph and JSON-LD URLs',()=>{
  for(const [slug,target] of retired){
    const html=read(`tools/${slug}/index.html`),absolute=`https://smbajwa.com${target}`;
    assert.match(html,new RegExp(`<link rel="canonical" href="${absolute.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"`),slug);
    assert.match(html,new RegExp(`<meta property="og:url" content="${absolute.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"`),slug);
    assert.equal(JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'][0].url,absolute,slug);
  }
});

test('Journal Hub exposes one workflow with five accessible modes and combined journal evidence', () => {
  const html = read('tools/journal-hub/index.html');
  const app = read('tools/journal-hub/app.js');
  for (const label of ['Find journals','Match my abstract','Compare','Trends / Explore','Check one journal']) assert.ok(html.includes(label), label);
  const combined = `${html}\n${app}`;
  for (const token of ['role="tablist"','role="tab"','aria-controls','Combined journal profile','Acceptance rate','Not openly available','lexical','private','Crossref','OpenAlex','DOAJ']) assert.match(combined, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'), token);
  for (const slug of ['journal-trust-profile','oa-apc-explorer','abstract-journal-matcher','journal-timing','emerging-journals-2026']) assert.match(html,new RegExp(slug));
  assert.match(app, /params\.get\('q'\)/);
  assert.match(app, /params\.get\('journal'\)/);
  assert.match(app, /history\.replaceState/);
  assert.match(app, /showComparisonFrames/);
  assert.match(app, /comparison-source/);
  assert.doesNotMatch(app, /innerHTML|insertAdjacentHTML/);
  assert.match(html,/One journal across sources/);
  assert.match(html,/OA\/APC tray (?:can )?compare up to four journals/i);
  assert.doesNotMatch(html,/up to five journals|Up to 5 comparisons/i);
});

test('Emerging Journals expires fallback cache entries and can clear only its lookup keys',()=>{
  const html=read('tools/emerging-journals-2026/index.html'),app=read('tools/emerging-journals-2026/app.js');
  assert.match(html,/id="clear-live-cache"[^>]*>Clear cached lookups/);
  assert.match(app,/cached&&Date\.now\(\)-cached\.saved<CACHE_TTL/);
  assert.match(app,/startsWith\(["']ej-openalex-v1-["']\)/);
});

test('Variant Toolkit tabs expose labels and complete keyboard navigation',()=>{
  const html=read('tools/variant-toolkit/index.html'),app=read('tools/variant-toolkit/app.js');
  for(const name of ['checker','predictor','guide']){
    assert.match(html,new RegExp(`id="tab-${name}"[^>]+aria-controls="panel-${name}"`));
    assert.match(html,new RegExp(`id="panel-${name}"[^>]+aria-labelledby="tab-${name}"`));
  }
  for(const key of ['ArrowLeft','ArrowRight','Home','End'])assert.match(app,new RegExp(key));
  assert.match(app,/preventDefault\(\)/);
});

test('Journal Hub lazy mounts workflows and does not eagerly load large datasets', () => {
  const html = read('tools/journal-hub/index.html');
  for (const asset of ['../emerging-journals-2026/data.js','../emerging-journals-2026/data-extra.js','../journal-timing/data/timing-data.js']) {
    assert.equal((html.match(new RegExp(`<script[^>]+${asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`,'g')) || []).length, 0, asset);
  }
  assert.equal(fs.existsSync(path.join(root,'tools/journal-hub/data.js')), false);
});

test('Publishing Toolkit exposes both retained workflows and links journal identifiers to Journal Hub', () => {
  const html = read('tools/publishing-toolkit/index.html');
  const app = read('tools/publishing-toolkit/app.js');
  for (const token of ['Reference checker','Identifier toolkit','role="tablist"','DOI','ISSN','ORCID','ISBN','Journal Hub']) assert.match(html,new RegExp(token,'i'),token);
  assert.match(html, /reference-checker\/\?embed=1/);
  assert.match(html, /identifier-toolkit\/\?embed=1/);
  assert.match(app, /data-src/);
  assert.doesNotMatch(app, /innerHTML|insertAdjacentHTML/);
});

test('directory and sitemap expose the final tools', () => {
  const directory = read('tools/index.html');
  const sitemap = read('sitemap.xml');
  const finalSlugs = ['journal-hub','publishing-toolkit','plant-lab-calculators','descriptive-statistics','journal-figure-resizer','variant-toolkit'];
  for (const slug of finalSlugs) {
    assert.match(directory,new RegExp(`href=["']${slug}/`));
    assert.ok(sitemap.includes(`https://smbajwa.com/tools/${slug}/`), slug);
  }
  for (const [slug] of retired) {
    assert.doesNotMatch(directory,new RegExp(`href=["']${slug}/`));
    assert.ok(!sitemap.includes(`https://smbajwa.com/tools/${slug}/`), slug);
  }
});
