import test from 'node:test';
import assert from 'node:assert/strict';

import { detectIdentifiers } from '../src/detect.js';
import { normalizeDoi, validateDoi } from '../src/doi.js';
import { normalizeIssn, validateIssn } from '../src/issn.js';
import { normalizeOrcid, validateOrcid } from '../src/orcid.js';
import { normalizeIsbn, validateIsbn } from '../src/isbn.js';
import { buildLookupUrls } from '../src/lookup.js';
import { crossrefToCsl, openAlexToCsl, compareMetadata } from '../src/format.js';
import { exportRecords } from '../src/export.js';

test('normalizes DOI URLs and trailing citation punctuation', () => {
  assert.equal(normalizeDoi(' https://doi.org/10.1000/xyz123). '), '10.1000/xyz123');
  assert.equal(validateDoi('doi:10.1038/s41586-020-2649-2').valid, true);
  assert.equal(validateDoi('10.12/nope').valid, false);
});

test('rejects DOI values containing embedded whitespace', () => {
  const result = validateDoi(' https://doi.org/10.1000/xy z. ');
  assert.equal(result.valid, false);
  assert.equal(result.normalized, '10.1000/xy z');
});

test('validates ISSN using the ISO 3297 check digit', () => {
  assert.equal(normalizeIssn('2049 3630'), '2049-3630');
  assert.equal(validateIssn('2049-3630').valid, true);
  assert.equal(validateIssn('2049-3631').valid, false);
  assert.equal(validateIssn('2434-561X').valid, true);
});

test('validates ORCID using ISO 7064 MOD 11-2', () => {
  assert.equal(normalizeOrcid('https://orcid.org/0000-0002-1825-0097'), '0000-0002-1825-0097');
  assert.equal(validateOrcid('0000-0002-1825-0097').valid, true);
  assert.equal(validateOrcid('0000-0002-1825-0098').valid, false);
});

test('validates ISBN-10 and ISBN-13 check digits', () => {
  assert.equal(normalizeIsbn('ISBN 978-0-306-40615-7'), '978-0-306-40615-7');
  assert.equal(validateIsbn('978-0-306-40615-7').valid, true);
  assert.equal(validateIsbn('0-306-40615-2').valid, true);
  assert.equal(validateIsbn('978-0-306-40615-8').valid, false);
});

test('detects mixed identifiers without silently dropping source text', () => {
  const result = detectIdentifiers('DOI: 10.1038/s41586-020-2649-2\nISSN 2049-3630\nORCID 0000-0002-1825-0097');
  assert.deepEqual(result.map(item => item.type), ['doi', 'issn', 'orcid']);
  assert.equal(result[0].raw, '10.1038/s41586-020-2649-2');
});

test('detects labelled and bare ISBN-10 and ISBN-13 values', () => {
  for (const input of ['ISBN 978-0-306-40615-7', '978-0-306-40615-7', 'ISBN 0-306-40615-2']) {
    const result = detectIdentifiers(input);
    assert.equal(result.length, 1, input);
    assert.equal(result[0].type, 'isbn', input);
    assert.equal(result[0].valid, true, input);
  }
});

test('builds only documented public lookup URLs and includes the OpenAlex mailto', () => {
  const urls = buildLookupUrls({ type: 'doi', normalized: '10.1038/s41586-020-2649-2' });
  assert.match(urls.crossref, /^https:\/\/api\.crossref\.org\/works\//);
  assert.match(urls.openalex, /mailto=contact%40smbajwa\.com/);
  assert.equal(urls.resolver, 'https://doi.org/10.1038%2Fs41586-020-2649-2');
});

test('maps provider metadata without retaining abstracts', () => {
  const record = crossrefToCsl({ DOI: '10.1/x', title: ['A <b>title</b>'], abstract: 'copyrighted', author: [{ given: 'Ada', family: 'Lovelace' }], issued: { 'date-parts': [[2024]] } });
  assert.equal(record.title, 'A title');
  assert.equal('abstract' in record, false);
  assert.equal(record.author[0].family, 'Lovelace');
  const open = openAlexToCsl({ doi: 'https://doi.org/10.1/x', title: 'A title', publication_year: 2024, authorships: [] });
  assert.equal(open.DOI, '10.1/x');
});

test('reports cross-source differences as evidence rather than a verdict', () => {
  const differences = compareMetadata({ title: 'Plant signals', issued: { 'date-parts': [[2024]] } }, { title: 'Plant signalling', issued: { 'date-parts': [[2023]] } });
  assert.deepEqual(differences.map(item => item.field), ['title', 'year']);
});

test('exports deterministic JSON without abstract fields', () => {
  const output = exportRecords([{ id: 'x', title: 'Safe', abstract: '<script>x</script>' }], 'json');
  assert.equal(output.includes('abstract'), false);
  assert.equal(output, '[\n  {\n    "id": "x",\n    "title": "Safe"\n  }\n]\n');
});

test('exports CSV with escaped cells', () => {
  assert.equal(exportRecords([{DOI:'10.1/x',title:'A, title',publisher:'Lab "One"'}], 'csv'), 'DOI,title,publisher,year\r\n10.1/x,"A, title","Lab ""One""",\r\n');
});
