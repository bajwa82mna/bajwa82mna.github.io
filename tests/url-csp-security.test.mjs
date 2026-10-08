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

test('Journal Hub tabs expose keyboard and selected state', () => {
  const html = fs.readFileSync(path.join(root, 'tools/journal-hub/index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'tools/journal-hub/app.js'), 'utf8');
  assert.match(html, /role="tablist"/);
  for (const value of ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'aria-selected']) assert.match(app + html, new RegExp(value));
});

const pages = {'tools/journal-hub/index.html':["'self'",'api.openalex.org','api.crossref.org','doaj.org'],'tools/publishing-toolkit/index.html':["'self'",'api.openalex.org','api.crossref.org','doaj.org']};

const sitePages = ['index.html', 'tools/index.html', 'privacy.html'];

test('top-level pages use site-only CSPs without inline scripts', () => {
  for (const page of sitePages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const csp=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];assert.match(csp,/default-src 'self'/);assert.match(csp,/script-src 'self'/);assert.doesNotMatch(csp,/script-src[^;]*unsafe-inline/);
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
    assert.match(csp, /style-src 'self'(?: 'unsafe-inline')?/);
    assert.match(csp, /img-src 'self' data:/);
    assert.match(csp, /base-uri (?:'self'|'none')/);
    assert.match(csp, /form-action (?:'self'|'none')/);
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
