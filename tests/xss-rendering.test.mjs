import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { safeTextElement } from '../tools/_shared/js/dom.js';

const payload = '<img src=x onerror=globalThis.__xss=1>';
const tools = {
  'identifier-toolkit': 'app.js',
  'reference-checker': 'app.js',
  'journal-trust-profile': 'app.js',
  'oa-apc-explorer': 'app.js',
  'abstract-journal-matcher': 'app.js',
  'emerging-journals-2026': 'app.js',
  'plant-lab-calculators': 'app.js',
};

for (const [tool, entry] of Object.entries(tools)) {
  test(`${tool} renders an XSS payload as text`, () => {
    const source = fs.readFileSync(path.join('tools', tool, entry), 'utf8');
    assert.doesNotMatch(source, /innerHTML|insertAdjacentHTML|<[^>]+\sonclick\s*=/i);
    if (tool === 'emerging-journals-2026') assert.match(source, /function text\([^)]*\).*?textContent/s);
    else assert.match(source, /safeTextElement/);
    const rendered = safeTextElement({ createElement: () => ({}) }, 'span', payload);
    assert.equal(rendered.textContent, payload);
    assert.equal(globalThis.__xss, undefined);
  });
}
