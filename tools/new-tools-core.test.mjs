import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { solveDilution, serialDilution } from './dilution-calculator/src/core.js';
import { analyseQpcr } from './qpcr-ddct-calculator/src/core.js';
import { transformSequence } from './reverse-complement/src/core.js';
import { describe } from './descriptive-statistics/src/core.js';
import { outputDimensions } from './journal-figure-resizer/src/core.js';

test('dilution equation solves V1 across compatible units', () => {
  const result = solveDilution({ c1: 100, c1Unit: 'mM', v1: null, v1Unit: 'mL', c2: 10, c2Unit: 'mM', v2: 50, v2Unit: 'mL' });
  assert.equal(result.value, 5);
  assert.equal(result.diluent, 45);
  assert.throws(() => solveDilution({ c1: 1, c1Unit: 'mM', v1: null, v1Unit: 'mL', c2: 2, c2Unit: 'mM', v2: 1, v2Unit: 'mL' }), /higher than stock/i);
});

test('serial dilution reports transfer and diluent volumes', () => {
  const rows = serialDilution({ factor: 10, steps: 3, finalVolume: 1000 });
  assert.deepEqual(rows.map(row => [row.transfer, row.diluent, row.relative]), [[100,900,0.1],[100,900,0.01],[100,900,0.001]]);
});

test('Livak analysis calculates propagated uncertainty', () => {
  const rows = [
    ['C','control','target',20],['C','control','target',20.2],['C','control','ref',18],['C','control','ref',18.2],
    ['T','treated','target',18],['T','treated','target',18.2],['T','treated','ref',18],['T','treated','ref',18.2]
  ];
  const result = analyseQpcr(rows,{target:'target',reference:'ref',control:'control'});
  assert.equal(result.find(x=>x.sample==='T').ddCt,-2);
  assert.equal(result.find(x=>x.sample==='T').fold,4);
});

test('Pfaffl analysis applies target and reference efficiencies independently', () => {
  const rows = [['C','control','target',20],['C','control','ref',18],['T','treated','target',19],['T','treated','ref',17.5]];
  const result = analyseQpcr(rows,{target:'target',reference:'ref',control:'control',mode:'pfaffl',targetEfficiency:1.9,referenceEfficiency:1.8});
  assert.equal(result.find(x=>x.sample==='T').fold, 1.9 / Math.sqrt(1.8));
});

test('sequence transformations support IUPAC DNA and RNA', () => {
  const dna = transformSequence('>x\nARYN');
  assert.equal(dna.records[0].reverseComplement, 'NRYT');
  assert.equal(dna.records[0].length, 4);
  assert.equal(transformSequence('AUGC',{rna:true}).records[0].reverseComplement, 'GCAU');
  assert.throws(() => transformSequence('ATZ'), /invalid/i);
});

test('descriptive statistics use sample SD and type-7 quartiles', () => {
  const result = describe([1,2,3,4,5]);
  assert.equal(result.mean,3);
  assert.equal(result.sd,Math.sqrt(2.5));
  assert.equal(result.q1,2);
  assert.equal(result.q3,4);
  assert.equal(result.outliers.length,0);
});

test('figure dimensions convert physical size at target DPI', () => {
  assert.deepEqual(outputDimensions({width:85,height:42.5,unit:'mm',dpi:300,aspect:2}),{width:1004,height:502});
});

test('local examples for data-driven tools are present and realistic', async () => {
  for (const path of ['./dilution-calculator/examples/dilution-example.txt','./qpcr-ddct-calculator/examples/qpcr-example.csv','./reverse-complement/examples/sequences.fasta','./descriptive-statistics/examples/grouped-values.csv']) {
    const text = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.ok(text.trim().split('\n').length >= 3, path);
  }
});
