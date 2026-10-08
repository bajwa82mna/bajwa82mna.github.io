import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {catalogue} from '../tools/_shared/js/catalogue.js';
import {
  filterTools,
  normalizeCategory,
  normalizePins,
  normalizeQuery,
} from '../tools/landing.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'tools/index.html'), 'utf8');

const decode = value => value.replaceAll('&amp;', '&');

test('static cards match the catalogue exactly', () => {
  const cards = [...html.matchAll(/<article class="tool-card" data-tool="([^"]+)"[\s\S]*?<h2><a href="([^"]+)">([^<]+)<\/a><\/h2>/g)]
    .map(([, slug, href, title]) => ({slug, href: decode(href), title}));
  assert.deepEqual(cards, catalogue.map(({slug, href, title}) => ({slug, href, title})));
});

test('every active tool directory is represented in the catalogue', () => {
  const legacy = new Set([...fs.readFileSync(path.join(root, 'tools/_shared/js/legacy-redirect.js'), 'utf8')
    .matchAll(/'\/tools\/([^/]+)\/'\s*:/g)].map(match => match[1]));
  const excluded = new Set(['_shared', 'privacy-and-sources', ...legacy]);
  const directories = fs.readdirSync(path.join(root, 'tools'), {withFileTypes: true})
    .filter(entry => entry.isDirectory() && !excluded.has(entry.name))
    .filter(entry => fs.existsSync(path.join(root, 'tools', entry.name, 'index.html')))
    .map(entry => entry.name).sort();
  assert.deepEqual(directories, catalogue.map(tool => tool.slug).sort());
});

test('query and category URL values are allow-listed and bounded', () => {
  assert.equal(normalizeQuery(`  ${'x'.repeat(100)}  `), 'x'.repeat(80));
  assert.equal(normalizeQuery(null), '');
  for (const id of ['journals-publishing', 'plant-sequence', 'statistics-figures', 'genomics']) {
    assert.equal(normalizeCategory(id), id);
  }
  for (const value of ['', 'all', 'unknown', '<script>']) assert.equal(normalizeCategory(value), 'all');
});

test('search synonyms find the intended tools', () => {
  const expected = new Map([
    ['qpcr', 'plant-lab-calculators'], ['ddct', 'plant-lab-calculators'],
    ['reverse complement', 'plant-lab-calculators'], ['vcf', 'variant-toolkit'],
    ['apc', 'journal-hub'], ['impact factor', 'journal-hub'],
    ['doi', 'publishing-toolkit'], ['dpi', 'journal-figure-resizer'],
    ['mean sd', 'descriptive-statistics'],
  ]);
  for (const [query, slug] of expected) {
    assert.ok(filterTools(catalogue, query, 'all').some(tool => tool.slug === slug), query);
  }
  assert.deepEqual(filterTools(catalogue, 'DOI', 'journals-publishing').map(tool => tool.slug), ['publishing-toolkit']);
});

test('stored pins are validated, deduplicated, and catalogue ordered', () => {
  assert.deepEqual(normalizePins(['variant-toolkit', 'bad', 'journal-hub', 'variant-toolkit'], catalogue), ['journal-hub', 'variant-toolkit']);
  assert.deepEqual(normalizePins('not-an-array', catalogue), []);
});

test('landing page contains no email address or mail link', () => {
  assert.doesNotMatch(html, /mailto:/i);
  assert.doesNotMatch(html, /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
});

test('JSON-LD contains a valid six-item list and breadcrumb', () => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  const nodes = blocks.flatMap(block => block['@graph'] || [block]);
  const list = nodes.find(node => node['@type'] === 'ItemList');
  const breadcrumb = nodes.find(node => node['@type'] === 'BreadcrumbList');
  assert.equal(list.numberOfItems, 6);
  assert.deepEqual(list.itemListElement.map(item => item.name), catalogue.map(tool => tool.title));
  assert.deepEqual(breadcrumb.itemListElement.map(item => item.name), ['Home', 'Tools']);
});

test('all internal landing-page links resolve to files', () => {
  const links = [...html.matchAll(/href="([^"]+)"/g)].map(match => decode(match[1]))
    .filter(href => !/^(?:https?:|#)/.test(href));
  for (const href of links) {
    const pathname = href.split(/[?#]/, 1)[0];
    const target = pathname.startsWith('/') ? path.join(root, pathname) : path.resolve(root, 'tools', pathname);
    const resolved = pathname.endsWith('/') ? path.join(target, 'index.html') : target;
    assert.ok(fs.existsSync(resolved), `${href} -> ${path.relative(root, resolved)}`);
  }
});
