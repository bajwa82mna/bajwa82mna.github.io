import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  normalizeFileText,
  parseCsv,
  validateLocalFile,
  enforceRowLimit,
  MAX_FILE_BYTES,
  readLocalFile,
  setupLocalFileInput,
} from '../js/file-input.js';
import {parsePlantCalculatorExample, applyPlantCalculatorExample} from '../js/plant-calculator-example.js';

test('normalizes a UTF-8 BOM and CRLF without changing content', () => {
  assert.equal(normalizeFileText('\ufeffdoi\r\n10.1038/nature12373\rline'), 'doi\n10.1038/nature12373\nline');
});

test('parses quoted CSV fields containing commas and escaped quotes', () => {
  assert.deepEqual(parseCsv('title,notes\r\n"Nature, London","said ""yes"""\r\n'), [
    ['title', 'notes'],
    ['Nature, London', 'said "yes"'],
  ]);
});

test('drops fully empty CSV rows but preserves an empty field', () => {
  assert.deepEqual(parseCsv('issn,label\n\n0028-0836,\n,\n'), [
    ['issn', 'label'],
    ['0028-0836', ''],
  ]);
});

test('rejects unsupported and oversized files with clear messages', () => {
  assert.throws(() => validateLocalFile({name: 'sample.exe', size: 12}, ['txt', 'csv']), /\.txt, \.csv/);
  assert.throws(() => validateLocalFile({name: 'sample.csv', size: MAX_FILE_BYTES + 1}, ['csv']), /2 MB/);
});

test('enforces the configured non-empty row limit', () => {
  assert.throws(() => enforceRowLimit('a\n\n b\nc', 2), /at most 2 non-empty rows/);
  assert.equal(enforceRowLimit('a\n\n b', 2), 2);
});

test('counts parsed CSV records instead of physical lines', async () => {
  const file = {name: 'multiline.csv', size: 40, text: async () => 'name,notes\nA,"first\nsecond"\nB,third\n'};
  const result = await readLocalFile(file, {extensions: ['csv'], maxRows: 3});
  assert.equal(result.rowCount, 3);
  await assert.rejects(readLocalFile(file, {extensions: ['csv'], maxRows: 2}), /at most 2 non-empty rows/);
});

test('rejects an unterminated quoted CSV field and reports it through the file UI', async () => {
  assert.throws(() => parseCsv('name,notes\nA,"unfinished\n'), /Malformed CSV.*unterminated quoted field/i);
  const status = {textContent: ''};
  const handle = setupLocalFileInput({status, extensions: ['csv'], maxRows: 10, onRead() { throw new Error('must not run'); }});
  await handle({name: 'broken.csv', size: 30, text: async () => 'name,notes\nA,"unfinished\n'});
  assert.match(status.textContent, /Malformed CSV.*unterminated quoted field/i);
});

test('parses and applies the advertised plant calculator text example', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const text = fs.readFileSync(path.join(here, '../../plant-lab-calculators/examples/calculator-examples.txt'), 'utf8');
  const parsed = parsePlantCalculatorExample(text);
  assert.deepEqual(parsed.qpcr.sampleTarget, ['22.0', '22.2', '21.8']);
  const values = new Map();
  const root = {querySelector(selector) { return {set value(value) { values.set(selector, value); }}; }};
  applyPlantCalculatorExample(parsed, root);
  assert.equal(values.get('#qpcr [name=sampleTarget]'), '22.0, 22.2, 21.8');
  assert.equal(values.get('#dilution [name=stock]'), '100');
  assert.equal(values.get('#dilution [name=target]'), '10');
  assert.equal(values.get('#dilution [name=finalVolume]'), '1000');
  assert.equal(values.get('#dilution [name=overagePercent]'), '10');
  assert.equal(values.get('#molarity [name=mass]'), '5.844');
  assert.equal(values.get('#molarity [name=molecularWeight]'), '58.44');
  assert.equal(values.get('#molarity [name=volume]'), '1');
  assert.equal(values.get('#tm [name=sequence]'), 'AGCTGACCTGATCGTACGTA');
  assert.equal(values.get('#tm [name=sodiumMm]'), '50');
  assert.equal(values.get('#tm [name=primerNm]'), '250');
});
