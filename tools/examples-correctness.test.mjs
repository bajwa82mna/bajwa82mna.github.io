import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {detectIdentifiers} from './identifier-toolkit/src/detect.js';
import {parseInput} from './reference-checker/src/parse.js';
import {findDuplicates} from './reference-checker/src/duplicates.js';
import {compareRecords} from './reference-checker/src/compare.js';
import {ddCq} from './plant-lab-calculators/src/qpcr.js';
import {singleDilution} from './plant-lab-calculators/src/dilution.js';
import {molarityFromMass} from './plant-lab-calculators/src/molarity.js';
import {nearestNeighbor} from './plant-lab-calculators/src/tm.js';
import {isValidIssn} from './journal-trust-profile/src/issn.js';
import {calculateBudget} from './oa-apc-explorer/src/budget.js';
import {prepareQuery} from './abstract-journal-matcher/src/preprocess.js';
import {createSearch} from './abstract-journal-matcher/src/search.js';
import {parseCsv} from './_shared/js/file-input.js';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test('identifier example contains normalized checksum-valid public identifiers', () => {
  const items = detectIdentifiers(read('./identifier-toolkit/examples/identifiers.txt'));
  assert.deepEqual(items.map(x => x.type), ['doi','doi','issn','issn','orcid','isbn']);
  assert.equal(items.every(x => x.valid), true);
  assert.deepEqual(items.filter(x => x.type === 'issn').map(x => x.normalized), ['0028-0836','1932-6203']);
});

test('reference DOI example detects its exact duplicate and discrepancy logic', () => {
  const parsed = parseInput(read('./reference-checker/examples/references.txt'), class { constructor(){ throw new Error('plain DOI mode'); } });
  assert.equal(parsed.records.length, 2);
  assert.deepEqual(parsed.records.map(x => x.DOI), ['10.1038/nature12373','10.1371/journal.pone.0000308']);
  assert.deepEqual(findDuplicates([...parsed.records, {...parsed.records[0], id:'duplicate'}]), [{indexes:[0,2],reason:'Same normalized DOI'}]);
  const findings = compareRecords({title:'Molecular Structure of Nucleic Acids',author:[{family:'Watson'}],year:1953,DOI:'10.1038/171737a0'},{title:'Unrelated maize study',author:[{family:'Smith'}],year:1956});
  assert.deepEqual(findings.map(x => [x.field,x.severity]), [['title','failure'],['year','discrepancy'],['authors','discrepancy']]);
});

test('calculator CSV reproduces hand-verified qPCR, dilution, molarity, and Tm outputs', () => {
  const rows = parseCsv(read('./plant-lab-calculators/examples/qpcr-ct.csv')).slice(1);
  const group=(sample,column)=>rows.filter(x=>x[0]===sample).map(x=>Number(x[column]));
  const qpcr=ddCq({sampleTarget:group('treated',1),sampleReference:group('treated',2),controlTarget:group('control',1),controlReference:group('control',2)});
  close(qpcr.sampleDelta,3); close(qpcr.controlDelta,5); close(qpcr.deltaDelta,-2); close(qpcr.fold,4);
  assert.deepEqual(singleDilution({stock:100,target:10,finalVolume:1000,overagePercent:10}), {prepared:1100,stockVolume:110,diluentVolume:990,warning:''});
  close(molarityFromMass({mass:5.844,massPrefix:'m',molecularWeight:58.44,volume:1,volumePrefix:'m'}).molarity,.1);
  close(nearestNeighbor('AGCTGACCTGATCGTACGTA').tm,47.924704559016334,1e-12);
});

test('trust/APC ISSN examples validate and budget arithmetic is exact', () => {
  const issns=parseCsv(read('./oa-apc-explorer/examples/issns.csv')).slice(1).map(x=>x[0]);
  assert.equal(issns.every(isValidIssn),true);
  assert.deepEqual(calculateBudget({amount:2000,articles:2,waiverPercent:25,taxPercent:10,uncertaintyPercent:10,rate:1.5}), {base:3000,expected:3300.0000000000005,low:2970.0000000000005,high:3630.0000000000005,converted:{low:4455.000000000001,expected:4950.000000000001,high:5445.000000000001}});
});

test('matcher example ranks a plant-relevant journal shortlist', () => {
  const example=parseCsv(read('./abstract-journal-matcher/examples/example-abstract.csv'))[1];
  const profiles=JSON.parse(read('./abstract-journal-matcher/data/journal-profiles.min.json'));
  const context={};vm.createContext(context);vm.runInContext(read('./abstract-journal-matcher/third_party/minisearch/7.2.0/minisearch.min.js'),context);
  const results=createSearch(context.MiniSearch,profiles)(prepareQuery({title:example[0],abstract:example[1],keywords:example[2]}));
  assert.equal(results.length,12);
  assert.ok(results.slice(0,10).some(x=>/plant|botan|crop|horticultur|physiolog/i.test(`${x.profile.title} ${x.profile.category}`)));
});

test('emerging-journal example matches the real 22,281-row data and exact quartiles', () => {
  const context={};vm.createContext(context);vm.runInContext(`${read('./emerging-journals-2026/data.js')};globalThis.raw=RAW`,context);
  const rows=context.raw.rows;
  assert.equal(rows.length,22281);
  assert.deepEqual([1,2,3,4].map(q=>rows.filter(row=>row[3]===q).length),[1911,3479,7246,9645]);
  const names=parseCsv(read('./emerging-journals-2026/examples/journals.csv')).slice(1).map(x=>x[0].toLowerCase());
  const matches=rows.filter(row=>names.includes(row[1].toLowerCase())).sort((a,b)=>a[1].localeCompare(b[1]));
  assert.equal(matches.length,3);
  assert.deepEqual(Array.from(matches,x=>x[1].toLowerCase()), [...names].sort());
});
