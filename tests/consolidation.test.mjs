import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const retired = [
  ['emerging-journals-2026', '/tools/journal-hub/'],
  ['journal-trust-profile', '/tools/journal-hub/?mode=check'],
  ['oa-apc-explorer', '/tools/journal-hub/?mode=find'],
  ['abstract-journal-matcher', '/tools/journal-hub/?mode=match'],
  ['journal-timing', '/tools/journal-hub/?mode=find'],
  ['reference-checker', '/tools/publishing-toolkit/?mode=references'],
  ['identifier-toolkit', '/tools/publishing-toolkit/?mode=identifiers'],
];

test('retired tool URLs are noindex full mounts with the shared redirect gate', () => {
  for (const [slug, target] of retired) {
    const html = read(`tools/${slug}/index.html`);
    assert.match(html, /name="robots" content="noindex,follow"/);
    assert.match(html, /legacy-redirect\.js\?v=15/);
    assert.match(html, /app\.js\?v=15/);
    assert.ok(target);
  }
});

test('shared legacy redirect preserves allow-listed q links', () => {
  const js = read('tools/_shared/js/legacy-redirect.js');
  assert.match(js, /keep: \['q'/);
  assert.match(js, /source\.searchParams\.get/);
  assert.match(js, /target\.searchParams\.set/);
  assert.match(js, /location\.replace/);
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
  assert.match(app, /profile-mount/);
  assert.doesNotMatch(app, /innerHTML|insertAdjacentHTML/);
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

test('directory and sitemap expose exactly the five final tools', () => {
  const directory = read('tools/index.html');
  const sitemap = read('sitemap.xml');
  const finalSlugs = ['journal-hub','publishing-toolkit','plant-lab-calculators','descriptive-statistics','journal-figure-resizer'];
  for (const slug of finalSlugs) {
    assert.match(directory,new RegExp(`href=["']${slug}/`));
    assert.ok(sitemap.includes(`https://smbajwa.com/tools/${slug}/`), slug);
  }
  for (const [slug] of retired) {
    assert.doesNotMatch(directory,new RegExp(`href=["']${slug}/`));
    assert.ok(!sitemap.includes(`https://smbajwa.com/tools/${slug}/`), slug);
  }
});
