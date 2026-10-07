import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDoi, normalizeText, validDoi } from '../src/normalize.js';
import { extractDois, parseInput } from '../src/parse.js';
import { compareRecords } from '../src/compare.js';
import { findDuplicates } from '../src/duplicates.js';
import { classifyUpdates } from '../src/updates.js';
import { exportReport } from '../src/export.js';

test('DOI normalization handles URLs, entities, encoding, and punctuation', () => { assert.equal(normalizeDoi(' HTTPS://doi.org/10.1000%2FABC.1. '), '10.1000/abc.1'); assert.equal(normalizeDoi('doi: 10.1234/X&amp;Y)'), '10.1234/x&y'); assert.deepEqual(extractDois('10.1000/ABC\r\nhttps://doi.org/10.1000/abc'), ['10.1000/abc']); });
test('DOI normalization preserves embedded whitespace so validation rejects it', () => { assert.equal(normalizeDoi(' https://doi.org/10.1000/xy z. '), '10.1000/xy z'); assert.equal(validDoi('10.1000/xy z'), false); });
test('normalization is idempotent and Unicode-aware', () => { const once = normalizeText('  Oryza—Sativa &amp; β '); assert.equal(normalizeText(once), once); assert.equal(once, 'oryza sativa β'); });
test('plain citations parse without inventing identifiers', () => { const result = parseInput('Khan A. Plant study. 2022.', class { constructor(){ throw new Error('no'); } }); assert.equal(result.records.length, 1); assert.equal(result.records[0].DOI, undefined); });
test('duplicates cluster same DOI and near-identical titles', () => { const groups = findDuplicates([{ DOI:'10.1/a', title:'A detailed plant genome study' }, { DOI:'10.1/a', title:'Different' }, { title:'A detailed plant genome study' }]); assert.ok(groups.length >= 2); });
test('field comparisons separate discrepancies', () => { const findings = compareRecords({ title:'Rice drought tolerance', author:[{family:'Khan'}], issued:{'date-parts':[[2020]]}, DOI:'10.1/a' }, { title:'Maize pathogen resistance', author:[{family:'Smith'}], issued:{'date-parts':[[2023]]} }); assert.ok(findings.some(f => f.severity === 'failure')); assert.ok(findings.some(f => f.field === 'authors')); });
test('updates collapse duplicates and retain retraction severity', () => { const updates = classifyUpdates({ 'update-to': [{ type:'retraction', DOI:'10.1/x', source:'RW' }, { type:'Retraction', DOI:'10.1/x', source:'Publisher' }, { type:'correction', DOI:'10.1/y' }] }); assert.equal(updates.length, 2); assert.equal(updates[0].severity, 'failure'); });
test('exports never invent identifiers', () => { const report = { generatedAt:'x', records:[{ local:{title:'No DOI'}, status:'Advisory', findings:[], updates:[], sources:[] }] }; for (const format of ['json','csv','md']) assert.doesNotMatch(exportReport(report, format), /10\.\d{4}/); });
