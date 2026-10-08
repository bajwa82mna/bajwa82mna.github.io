import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeUrl } from '../tools/_shared/js/safe-link.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('safeUrl permits only absolute HTTP(S) URLs', () => {
  assert.equal(safeUrl('https://example.org/path'), 'https://example.org/path');
  assert.equal(safeUrl('http://example.org/path'), 'http://example.org/path');
  for (const payload of ['javascript:alert(1)', ' data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', '//example.org/path', '/relative', '', null]) {
    assert.equal(safeUrl(payload), null, String(payload));
  }
});

test('metadata link renderers reuse the shared URL gate', () => {
  for (const file of [
    'tools/emerging-journals-2026/app.js',
    'tools/journal-trust-profile/app.js',
    'tools/oa-apc-explorer/app.js',
    'tools/abstract-journal-matcher/app.js',
    'tools/identifier-toolkit/app.js',
    'tools/reference-checker/app.js'
  ]) assert.match(fs.readFileSync(path.join(root, file), 'utf8'), /safe-link\.js/);
});

test('journal suggestion listbox exposes full keyboard and active-option state', () => {
  const html = fs.readFileSync(path.join(root, 'tools/journal-trust-profile/index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'tools/journal-trust-profile/app.js'), 'utf8');
  assert.match(html, /role="listbox"/);
  assert.match(html, /aria-autocomplete="list"/);
  for (const value of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Escape', 'aria-activedescendant', 'aria-selected']) assert.match(app, new RegExp(value));
});

const pages = {
  'tools/abstract-journal-matcher/index.html': ["'self'", 'api.openalex.org', 'api.crossref.org', 'doaj.org'],
  'tools/emerging-journals-2026/index.html': ['api.openalex.org'],
  'tools/journal-trust-profile/index.html': ["'self'", 'api.openalex.org', 'api.crossref.org', 'doaj.org'],
  'tools/oa-apc-explorer/index.html': ['api.openalex.org', 'doaj.org']
  ,'tools/journal-timing/index.html': ["'self'"]
};

const sitePages = ['index.html', 'tools/index.html', 'privacy.html'];

test('top-level pages use the site-only CSP without inline scripts', () => {
  const expected = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; base-uri 'self'; form-action 'self'";
  for (const page of sitePages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.equal(html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1], expected, page);
    assert.doesNotMatch(html, /<script(?![^>]*\b(?:src=|type="application\/ld\+json"))[^>]*>[\s\S]*?<\/script>/i, `${page}: inline executable script`);
  }
});

test('tool CSPs are strict, enumerate exact connect hosts, and allow every local script', () => {
  for (const [page, hosts] of Object.entries(pages)) {
    const absolute = path.join(root, page), html = fs.readFileSync(absolute, 'utf8');
    const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
    assert.ok(csp, `${page}: missing CSP`);
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /script-src 'self'(?:;|$)/);
    assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
    assert.match(csp, /style-src 'self' 'unsafe-inline'/);
    assert.match(csp, /img-src 'self' data:/);
    assert.match(csp, /base-uri 'self'/);
    assert.match(csp, /form-action 'self'/);
    const connect = csp.match(/connect-src ([^;]+)/)?.[1].split(/\s+/).filter(Boolean) || [];
    assert.deepEqual(connect.sort(), hosts.map(host => host === "'self'" ? host : `https://${host}`).sort(), `${page}: connect-src`);
    assert.doesNotMatch(html, /<script(?![^>]*\b(?:src=|type="application\/ld\+json"))[^>]*>[\s\S]*?<\/script>/i, `${page}: inline executable script`);
    for (const [, src] of html.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/g)) {
      assert.ok(!/^https?:/.test(src), `${page}: remote script ${src}`);
      const clean = src.split('?')[0], target = clean.startsWith('/') ? path.join(root, clean) : path.resolve(path.dirname(absolute), clean);
      assert.ok(fs.existsSync(target), `${page}: missing CSP-loaded script ${src}`);
    }
  }
});
