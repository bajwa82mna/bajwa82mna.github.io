import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const release = '16';
const entries = fs.readdirSync('tools', {withFileTypes: true})
  .filter(entry => entry.isDirectory() && fs.existsSync(path.join('tools', entry.name, 'index.html')))
  .map(entry => path.resolve('tools', entry.name, 'index.html'));

function localEdges(file) {
  const text = fs.readFileSync(file, 'utf8');
  const refs = [];
  const pattern = file.endsWith('.html')
    ? /(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g
    : file.endsWith('.css')
      ? /@import\s+(?:url\()?['"]?([^'"\s)]+\.css(?:\?[^'"\s)]*)?)/g
      : /(?:from\s*|import\s*\()['"]([^'"]+\.js(?:\?[^'"]*)?)['"]/g;
  for (const match of text.matchAll(pattern)) {
    const ref = match[1];
    if (/^(?:https?:|data:)/.test(ref)) continue;
    const [pathname, query = ''] = ref.split('?');
    const target = pathname.startsWith('/') ? path.join(root, pathname) : path.resolve(path.dirname(file), pathname);
    refs.push({ref, target, version: new URLSearchParams(query).get('v')});
  }
  return refs;
}

test('every HTML entry reaches one release version across local JS and CSS edges', () => {
  const failures = [];
  for (const entry of entries) {
    const queue = [entry], seen = new Set();
    while (queue.length) {
      const file = queue.pop();
      if (seen.has(file) || !fs.existsSync(file)) continue;
      seen.add(file);
      for (const edge of localEdges(file)) {
        if (edge.version !== release) failures.push(`${path.relative(root, entry)} -> ${edge.ref}`);
        if (/\.(?:js|css)$/.test(edge.target)) queue.push(edge.target);
      }
    }
  }
  assert.deepEqual(failures, []);
});
