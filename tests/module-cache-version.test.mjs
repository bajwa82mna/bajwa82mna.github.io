import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const toolRoot = path.resolve('tools');
function javascriptFiles(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return ['third_party','vendor','tests'].includes(entry.name) ? [] : javascriptFiles(full);
    return /(?:^|\/)(?:app|src\/[^/]+)\.js$/.test(path.relative(toolRoot, full)) ? [full] : [];
  });
}
test('every relative tool module import carries a cache version', () => {
  const failures = [];
  for (const file of javascriptFiles(toolRoot)) for (const match of fs.readFileSync(file, 'utf8').matchAll(/(?:from\s*|import\s*\()['"](\.{1,2}\/[^'"]+)['"]/g)) {
    if (!/\?v=\d+$/.test(match[1])) failures.push(`${path.relative('.', file)}: ${match[1]}`);
  }
  assert.deepEqual(failures, []);
});
