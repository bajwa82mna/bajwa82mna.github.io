import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');

const legacy = {
  trust: ['journal-trust-profile', ['checklist', 'print', 'export', 'lookup', 'cache']],
  apc: ['oa-apc-explorer', ['waiver', 'licence', 'budget', 'compare', 'export']],
  matcher: ['abstract-journal-matcher', ['exclude', 'expand', 'divers', 'OA', 'APC', 'cache', 'CSV', 'JSON']],
  timing: ['journal-timing', ['sample', 'IQR', 'retriev', 'coverage', 'CSV', 'sort']],
  trends: ['emerging-journals-2026', ['search', 'filter', 'trend', 'share']],
  references: ['reference-checker', ['file', 'Crossref', 'OpenAlex', 'retract', 'provenance', 'cache', 'Markdown']],
  identifiers: ['identifier-toolkit', ['Crossref', 'OpenAlex', 'DOAJ', 'citation', 'copy', 'BibTeX', 'RIS']],
};

test('each consolidated panel mounts the complete audited legacy application', () => {
  const journal = read('tools/journal-hub/index.html');
  const publishing = read('tools/publishing-toolkit/index.html');
  for (const [key, [slug, features]] of Object.entries(legacy)) {
    const host = ['references', 'identifiers'].includes(key) ? publishing : journal;
    assert.match(host, new RegExp(`tools/${slug}/\\?embed=1|../${slug}/\\?embed=1`), `${key} mount`);
    const source = `${read(`tools/${slug}/index.html`)}\n${read(`tools/${slug}/app.js`)}`;
    for (const feature of features) assert.match(source, new RegExp(feature, 'i'), `${key}: ${feature}`);
  }
});

test('legacy redirects share one allow-listed query-preserving implementation', () => {
  const redirect = read('tools/_shared/js/legacy-redirect.js');
  for (const token of ['example', 'q', 'journal', 'mode', 'tab', 'searchParams', 'location.replace']) assert.match(redirect, new RegExp(token));
  for (const slug of Object.values(legacy).map(([slug]) => slug).concat(['dilution-calculator', 'qpcr-ddct-calculator', 'reverse-complement'])) {
    assert.match(read(`tools/${slug}/index.html`), /legacy-redirect\.js\?v=23/);
  }
});

test('sequence workflow restores operation selection and FASTA download', () => {
  const source = `${read('tools/plant-lab-calculators/index.html')}\n${read('tools/plant-lab-calculators/app.js')}`;
  assert.match(source, /sequence-operation/);
  assert.match(source, /Download FASTA/);
  assert.match(source, /plant-lab-sequences\.fasta/);
});

test('Journal Hub initial page stays under the local asset budget and lazy mounts tools', () => {
  const html = read('tools/journal-hub/index.html');
  assert.doesNotMatch(html, /<script[^>]+(?:data-extra|timing-data|journal-profiles|index\.min)/);
  assert.match(read('tools/journal-hub/app.js'), /IntersectionObserver|data-src/);
  assert.ok(Buffer.byteLength(html) + Buffer.byteLength(read('tools/journal-hub/app.js')) < 100_000);
});

test('every legacy redirect route keeps ?example=1 and the hubs pass it to the first frame', () => {
  const redirect = read('tools/_shared/js/legacy-redirect.js');
  const routes = redirect.split('\n').filter(line => line.includes("to: '"));
  assert.ok(routes.length >= 10);
  assert.match(redirect,/const SAFE_PARAMS = \['q', 'journal', 'example'\]/);
  for (const hub of ['journal-hub', 'publishing-toolkit']) assert.match(read(`tools/${hub}/app.js`), /exampleRequested/);
});
