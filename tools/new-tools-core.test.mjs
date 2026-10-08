import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { solveDilution, serialDilution } from './plant-lab-calculators/src/dilution-core.js';
import { analyseQpcr } from './plant-lab-calculators/src/qpcr-core.js';
import { transformSequence } from './plant-lab-calculators/src/sequence-core.js';
import { describe, tCritical975 } from './descriptive-statistics/src/core.js';
import { outputDimensions } from './journal-figure-resizer/src/core.js';

test('dilution equation solves V1 across compatible units', () => {
  const result = solveDilution({ c1: 100, c1Unit: 'mM', v1: null, v1Unit: 'mL', c2: 10, c2Unit: 'mM', v2: 50, v2Unit: 'mL' });
  assert.equal(result.value, 5);
  assert.ok(Math.abs(result.diluent - 45) < 1e-12);
  assert.throws(() => solveDilution({ c1: 1, c1Unit: 'mM', v1: null, v1Unit: 'mL', c2: 2, c2Unit: 'mM', v2: 1, v2Unit: 'mL' }), /higher than stock/i);
});

test('dilution uses normalized volumes and rejects concentration workflows', () => {
  const mixed = solveDilution({ c1: 100, c1Unit: 'mM', v1: null, v1Unit: 'uL', c2: 10, c2Unit: 'mM', v2: 1, v2Unit: 'mL' });
  assert.ok(Math.abs(mixed.value - 100) < 1e-12);
  assert.ok(Math.abs(mixed.diluent - 0.9) < 1e-12);
  assert.throws(() => solveDilution({ c1: null, c1Unit: 'mM', v1: 2, v1Unit: 'mL', c2: 10, c2Unit: 'mM', v2: 1, v2Unit: 'mL' }), /higher than stock|stock volume/i);
  assert.throws(() => solveDilution({ c1: 10, c1Unit: 'mM', v1: 2, v1Unit: 'mL', c2: null, c2Unit: 'mM', v2: 1, v2Unit: 'mL' }), /higher than stock|stock volume/i);
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

test('Pfaffl analysis rejects invalid amplification factors', () => {
  const rows = [['C','control','target',20],['C','control','ref',18]];
  for (const factor of [0,-1,NaN,Infinity,2.01]) assert.throws(() => analyseQpcr(rows,{target:'target',reference:'ref',control:'control',mode:'pfaffl',targetEfficiency:factor,referenceEfficiency:2}), /1 to 2/);
});

test('Pfaffl factor controls publish the enforced range', async () => {
  const html = await readFile(new URL('./plant-lab-calculators/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="te" type="number" min="1" max="2"/);
  assert.match(html, /id="re" type="number" min="1" max="2"/);
  assert.match(html, /per-cycle multipliers from 1 .* to 2/s);
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

test('Student-t confidence intervals use the exact df quantile', () => {
  const result = describe([1,2,3,4,5,6]);
  assert.ok(Math.abs(tCritical975(5) - 2.570581835636305) < 1e-12);
  assert.equal(result.ciLow.toFixed(4), '1.5367');
  assert.equal(result.ciHigh.toFixed(4), '5.4633');
  assert.ok(Math.abs(tCritical975(29) - 2.045229642132703) < 1e-11);
  assert.ok(Math.abs(tCritical975(120) - 1.979930405052777) < 1e-9);
});

test('remaining standalone tool styles do not depend on deleted legacy tool assets', async () => {
  for (const tool of ['descriptive-statistics','journal-figure-resizer']) {
    const css = await readFile(new URL(`./${tool}/styles.css`, import.meta.url), 'utf8');
    assert.doesNotMatch(css, /dilution-calculator|qpcr-ddct-calculator|reverse-complement/);
  }
});

test('figure dimensions convert physical size at target DPI', () => {
  assert.deepEqual(outputDimensions({width:85,height:42.5,unit:'mm',dpi:300,aspect:2}),{width:1004,height:502});
});

test('figure dimensions enforce the cap after aspect locking', () => {
  assert.throws(() => outputDimensions({width:1000,height:1,unit:'px',dpi:300,aspect:0.001,lock:true}), /80-megapixel/);
  assert.deepEqual(outputDimensions({width:1000,height:1,unit:'px',dpi:300,aspect:2,lock:true}), {width:1000,height:500});
});

test('figure export aborts when resize validation fails', async () => {
  const app = await readFile(new URL('./journal-figure-resizer/app.js', import.meta.url), 'utf8');
  assert.match(app, /return true/);
  assert.match(app, /return false/);
  assert.match(app, /if\(!image\|\|!resize\(\)\)return/);
});

test('local examples for data-driven tools are present and realistic', async () => {
  for (const path of ['./plant-lab-calculators/examples/calculator-examples.txt','./plant-lab-calculators/examples/qpcr-ct.csv','./plant-lab-calculators/examples/sequences.fasta','./descriptive-statistics/examples/grouped-values.csv']) {
    const text = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.ok(text.trim().split('\n').length >= 3, path);
  }
});
