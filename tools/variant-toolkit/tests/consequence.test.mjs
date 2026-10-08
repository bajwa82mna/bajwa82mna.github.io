import test from 'node:test';
import assert from 'node:assert/strict';
import {predictConsequences} from '../src/consequence.js';

const fasta='>chr1\nAAAAATGGAACTGTAACCCGGGTTTAAA\n';
const gff='##gff-version 3\nchr1\tstudy\tmRNA\t5\t19\t.\t+\t.\tID=tx1;Parent=g1\nchr1\tstudy\tCDS\t5\t10\t.\t+\t0\tParent=tx1\nchr1\tstudy\tCDS\t14\t19\t.\t+\t0\tParent=tx1\n';
const vcf=(pos,ref,alt)=>`##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\nchr1\t${pos}\t.\t${ref}\t${alt}\t.\tPASS\t.\n`;

test('calls synonymous, missense and nonsense SNVs in a spliced plus-strand CDS',()=>{
  assert.equal(predictConsequences({vcf:vcf(10,'A','G'),gff,fasta})[0].consequence,'synonymous_variant');
  assert.equal(predictConsequences({vcf:vcf(9,'A','C'),gff,fasta})[0].consequence,'missense_variant');
  assert.equal(predictConsequences({vcf:vcf(8,'G','T'),gff,fasta})[0].consequence,'stop_gained');
});

test('calls frameshift and in-frame coding indels',()=>{
  assert.equal(predictConsequences({vcf:vcf(7,'G','GA'),gff,fasta})[0].consequence,'frameshift_variant');
  assert.equal(predictConsequences({vcf:vcf(7,'G','GAAA'),gff,fasta})[0].consequence,'inframe_insertion');
});

test('flags the two intronic bases beside a CDS boundary',()=>{
  const result=predictConsequences({vcf:vcf(11,'C','T'),gff,fasta})[0];
  assert.equal(result.consequence,'splice_site_variant');
  assert.equal(result.experimental,true);
});

test('handles reverse-strand CDS and validates reference alleles',()=>{
  const reverseFasta='>chrR\nTTACTGTTCCAT\n';
  const reverseGff='chrR\tx\tmRNA\t1\t12\t.\t-\t.\tID=rev\nchrR\tx\tCDS\t1\t6\t.\t-\t0\tParent=rev\nchrR\tx\tCDS\t7\t12\t.\t-\t0\tParent=rev\n';
  assert.equal(predictConsequences({vcf:vcf(6,'G','A').replaceAll('chr1','chrR'),gff:reverseGff,fasta:reverseFasta})[0].consequence,'stop_gained');
  assert.throws(()=>predictConsequences({vcf:vcf(5,'C','T'),gff,fasta}),/reference allele/i);
});

test('rejects unsupported symbolic alleles and phase-bearing CDS models',()=>{
  assert.throws(()=>predictConsequences({vcf:vcf(7,'G','<DEL>'),gff,fasta}),/DNA alleles/i);
  assert.throws(()=>predictConsequences({vcf:vcf(7,'G','A'),gff:gff.replace('\t0\tParent=tx1','\t1\tParent=tx1'),fasta}),/phase 0/i);
});
