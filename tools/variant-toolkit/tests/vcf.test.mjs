import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeVcf} from '../src/vcf.js';

const header='##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n';

test('summarizes SNPs, indels, chromosomes, multiallelic sites and Ti/Tv',()=>{
  const vcf=header+'1\t10\t.\tA\tG\t.\tPASS\t.\n1\t20\t.\tC\tA,T\t.\tPASS\t.\n2\t30\t.\tAT\tA\t.\tPASS\t.\n';
  assert.deepEqual(summarizeVcf(vcf),{
    valid:true,records:3,alleles:4,snps:3,indels:1,other:0,multiallelic:1,
    transitions:2,transversions:1,tsTv:2,chromosomes:{'1':2,'2':1},malformed:[]
  });
});

test('reports malformed record line numbers without counting bad records',()=>{
  const result=summarizeVcf(header+'1\tx\t.\tA\tG\t.\tPASS\t.\n1\t4\t.\tA\t.\t.\tPASS\t.\n');
  assert.equal(result.valid,false);
  assert.deepEqual(result.malformed.map(x=>x.line),[3,4]);
  assert.equal(result.records,0);
});

test('requires the VCF column header and rejects oversized text',()=>{
  assert.match(summarizeVcf('1\t1\t.\tA\tT\t.\t.\t.').malformed[0].message,/header/i);
  assert.throws(()=>summarizeVcf('x'.repeat(2*1024*1024+1)),/2 MB/);
});
