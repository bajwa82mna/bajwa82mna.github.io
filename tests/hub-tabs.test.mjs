import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('tools/journal-hub/index.html', 'utf8');
const app = fs.readFileSync('tools/journal-hub/app.js', 'utf8');

test('every Journal Hub tab panel has one orientation heading and intro', () => {
  for (const mode of ['find', 'match', 'compare', 'trends', 'check']) {
    const panel = html.match(new RegExp(`<section id="panel-${mode}"[\\s\\S]*?<\\/section>`))?.[0] || '';
    assert.match(panel, /<h2>[^<]+<\/h2>/, mode);
    assert.match(panel, /<h2>[^<]+<\/h2>\s*<p>[^<]+<\/p>/, mode);
  }
});

test('Compare empty state offers Find and verified examples without developer query syntax', () => {
  const empty = html.match(/<div id="compare-empty"[\s\S]*?<\/div>\s*<\/div>/)?.[0] || '';
  assert.match(empty, />Choose a journal</);
  for (const journal of ['Plant Journal', 'Nature Communications', 'PLoS One', 'Horticulture Research']) {
    assert.match(empty, new RegExp(`>${journal}<`));
  }
  assert.doesNotMatch(empty, /\?q=/);
  assert.match(html, />Clear selection</);
  assert.match(app, /focusFindSearch/);
});

test('compact heroes keep chips and Share in one row wrapper', () => {
  for (const file of ['tools/journal-hub/index.html', 'tools/publishing-toolkit/index.html']) {
    const source = fs.readFileSync(file, 'utf8');
    const row = source.match(/<div class="hero-meta-row">[\s\S]*?<\/div>\s*<\/div>/)?.[0] || '';
    assert.match(row, /class="[^"]*(?:chips|data-chips)[^"]*"/);
    assert.match(row, /class="hero-actions"/);
    assert.match(row, /data-share/);
  }
});

test('timing documentation is hidden only through the embed flag while caveats remain', () => {
  const timing = fs.readFileSync('tools/journal-timing/index.html', 'utf8');
  const embedJs = fs.readFileSync('tools/_shared/js/embed.js', 'utf8');
  const embedCss = fs.readFileSync('tools/_shared/css/embed.css', 'utf8');
  assert.match(timing, /Read before comparing:/);
  const timingApp = fs.readFileSync('tools/journal-timing/app.js', 'utf8');
  assert.match(`${timing}\n${timingApp}`, /live (?:Crossref )?(?:lookup|request)/i);
  assert.match(embedJs, /embed-documentation/);
  for (const heading of ['how to (?:use|compare|read)', 'about', 'frequently asked questions', 'related tools']) {
    assert.match(embedJs, new RegExp(heading, 'i'));
  }
  assert.match(embedCss, /html\.is-embedded \.embed-documentation/);
});
