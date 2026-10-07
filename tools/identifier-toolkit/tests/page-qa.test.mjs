import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(resolve(toolDir, 'index.html'), 'utf8');

test('every external HTML link opens safely in a new tab', () => {
  const tags = html.match(/<a\b[^>]*href="https?:\/\/[^>]+>/g) || [];
  assert.ok(tags.length > 0);
  for (const tag of tags) {
    assert.match(tag, /target="_blank"/);
    assert.match(tag, /rel="noopener noreferrer"/);
  }
});

test('all local stylesheets and scripts referenced by the page exist', async () => {
  const references = [...html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)].map(match => match[1]).filter(path => path.endsWith('.js') || path.endsWith('.css'));
  for (const reference of references) {
    const target = reference.startsWith('/') ? resolve(toolDir, '../..', reference.slice(1)) : resolve(toolDir, reference);
    await assert.doesNotReject(access(target), `Missing local asset: ${reference}`);
  }
});

test('page declares the allowed lookup domains and no API key', () => {
  for (const domain of ['api.crossref.org', 'api.openalex.org', 'doaj.org']) assert.ok(html.includes(domain));
  assert.doesNotMatch(html, /(api[_-]?key|client[_-]?secret)\s*[:=]/i);
});
