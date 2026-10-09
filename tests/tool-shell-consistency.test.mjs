import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = [
  ['tools/journal-hub/index.html', 'Journal Hub'],
  ['tools/publishing-toolkit/index.html', 'Publishing Toolkit'],
  ['tools/plant-lab-calculators/index.html', 'Plant Lab Toolkit'],
  ['tools/descriptive-statistics/index.html', 'Descriptive Statistics'],
  ['tools/journal-figure-resizer/index.html', 'Journal Figure Resizer'],
  ['tools/variant-toolkit/index.html', 'Variant Toolkit'],
  ['tools/privacy-and-sources/index.html', 'Privacy and sources'],
  ['credits/index.html', 'Credits and data sources'],
];

const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

for (const [relative, current] of pages) {
  test(`${relative} uses the shared tool shell and canonical hero structure`, () => {
    const html = read(relative);
    assert.match(html, /href="\/tools\/_shared\/css\/tool-shell\.css\?v=24"/);
    assert.equal((html.match(/<nav\b[^>]*aria-label="Breadcrumb"/g) || []).length, 1);
    assert.match(html, new RegExp(`<nav\\b[^>]*aria-label="Breadcrumb"[^>]*>\\s*<a href="/">Home</a>\\s*<span aria-hidden="true">/</span>\\s*<a href="/tools/">Tools</a>\\s*<span aria-hidden="true">/</span>\\s*<span aria-current="page">${current}</span>\\s*</nav>`));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    if (html.includes('data-share')) {
      assert.match(html, /<div class="hero-actions">[\s\S]*?data-share[\s\S]*?<\/div>/);
    }
  });
}

test('the tools landing page loads the shared tool shell', () => {
  const html = read('tools/index.html');
  assert.match(html, /href="\/tools\/_shared\/css\/tool-shell\.css\?v=24"/);
  assert.match(html, /<nav class="breadcrumb" aria-label="Breadcrumb"><a href="\/">Home<\/a><span aria-hidden="true">\/<\/span><span aria-current="page">Tools<\/span><\/nav>/);
  assert.match(html, /<div class="hero-actions">[\s\S]*?data-share[\s\S]*?<\/div>/);
});

test('page stylesheets do not redefine shared hero or tab foundations', () => {
  const stylesheets = [
    'tools/journal-hub/styles.css',
    'tools/publishing-toolkit/styles.css',
    'tools/plant-lab-calculators/styles.css',
    'tools/plant-lab-calculators/toolkit.css',
    'tools/plant-lab-calculators/ui.css',
    'tools/descriptive-statistics/styles.css',
    'tools/journal-figure-resizer/styles.css',
    'tools/variant-toolkit/styles.css',
  ];
  for (const relative of stylesheets) {
    const css = read(relative);
    assert.doesNotMatch(css, /(?:^|})\s*\.tool-hero(?:\s|\{|,)/m, relative);
    assert.doesNotMatch(css, /(?:^|})\s*\.(?:tablist|tabs)\s*\{[^}]*display\s*:/m, relative);
  }
});

test('tool CSS does not declare visible text below 13px', () => {
  const stylesheets = [
    'tools/_shared/css/tool-shell.css', 'tools/tools.css',
    'tools/journal-hub/styles.css', 'tools/publishing-toolkit/styles.css',
    'tools/plant-lab-calculators/styles.css', 'tools/plant-lab-calculators/toolkit.css',
    'tools/plant-lab-calculators/ui.css', 'tools/descriptive-statistics/styles.css',
    'tools/journal-figure-resizer/styles.css', 'tools/variant-toolkit/styles.css',
  ];
  for (const relative of stylesheets) {
    const css = read(relative);
    for (const match of css.matchAll(/font-size\s*:\s*([\d.]+)(px|rem)/gi)) {
      const pixels = match[2].toLowerCase() === 'rem' ? Number(match[1]) * 16 : Number(match[1]);
      assert.ok(pixels >= 13, `${relative}: ${match[0]}`);
    }
  }
});
