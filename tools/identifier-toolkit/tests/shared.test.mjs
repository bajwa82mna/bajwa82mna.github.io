import test from 'node:test';
import assert from 'node:assert/strict';

import { createMemoryCache } from '../../_shared/js/cache.js';
import { provenanceRecord } from '../../_shared/js/provenance.js';

test('cache expires entries and never returns stale data as fresh', () => {
  let now = 1_000;
  const cache = createMemoryCache({ now: () => now, ttl: 50 });
  cache.set('a', { title: 'Example' });
  assert.deepEqual(cache.get('a'), { title: 'Example' });
  now = 1_051;
  assert.equal(cache.get('a'), null);
});

test('provenance records include source, URL, retrieval time and status', () => {
  const item = provenanceRecord({ source: 'Crossref', url: 'https://api.crossref.org/works/x', status: 'found', retrievedAt: '2026-10-07T00:00:00.000Z' });
  assert.deepEqual(item, { source: 'Crossref', url: 'https://api.crossref.org/works/x', status: 'found', retrievedAt: '2026-10-07T00:00:00.000Z' });
});
