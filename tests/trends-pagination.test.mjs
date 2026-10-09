import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PAGE_SIZE, paginationState} from '../tools/emerging-journals-2026/src/pagination.js';

test('Trends pagination exposes 12 at a time with accurate counts', () => {
  assert.equal(PAGE_SIZE, 12);
  assert.deepEqual(paginationState(7120, 1), {
    shown: 12,
    hasMore: true,
    nextCount: 12,
    status: 'Showing 12 of 7,120 journals',
  });
  assert.equal(paginationState(7120, 2).shown, 24);
  assert.equal(paginationState(18, 1).nextCount, 6);
  assert.equal(paginationState(12, 1).hasMore, false);
  assert.equal(paginationState(0, 1).status, '0 journals found');
});

test('Trends app resets disclosure on every filter and labels show-more', () => {
  const app = fs.readFileSync('tools/emerging-journals-2026/app.js', 'utf8');
  assert.match(app, /Show \$\{disclosure\.nextCount\} more/);
  assert.match(app, /s\.page\s*=\s*1/g);
  assert.match(app, /a\.slice\(0,\s*disclosure\.shown\)/);
});
