import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL_LIMITS,predictConsequences} from '../src/consequence.js';

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

test('rejects malformed GFF3 models with line-specific errors before prediction',()=>{
  const cases=[
    ['chr1\tx\tmRNA\t1\t3\t.\t+\t.\tID=\n',/line 1.*ID/i],
    ['chr1\tx\tCDS\t1\t3\t.\t+\t0\tParent=\n',/line 1.*Parent/i],
    ['chr1\tx\tCDS\tx\t3\t.\t+\t0\tParent=tx\n',/line 1.*coordinates/i],
    ['chr1\tx\tCDS\t4\t3\t.\t+\t0\tParent=tx\n',/line 1.*coordinates/i],
    ['chr1\tx\tCDS\t1\t99\t.\t+\t0\tParent=tx\n',/line 1.*exceeds FASTA/i],
    ['chr1\tx\tCDS\t1\t3\t.\t.\t0\tParent=tx\n',/line 1.*strand/i],
    ['chr1\tx\tCDS\t1\t4\t.\t+\t0\tParent=tx\nchr1\tx\tCDS\t4\t6\t.\t+\t0\tParent=tx\n',/line 2.*overlap/i],
    ['chr1\tx\tCDS\t1\t3\t.\t+\t0\tParent=tx\nchr1\tx\tCDS\t5\t6\t.\t-\t0\tParent=tx\n',/line 2.*inconsistent strands/i],
    ['chr1\tx\tCDS\t1\t3\t.\t+\t0\tParent=tx\nchr2\tx\tCDS\t1\t3\t.\t+\t0\tParent=tx\n',/line 2.*inconsistent contigs/i],
  ];
  const validationFasta=`${fasta}>chr2\nAAAA\n`;
  for(const [model,error] of cases)assert.throws(()=>predictConsequences({vcf:vcf(1,'A','C'),gff:model,fasta:validationFasta}),error);
});

test('enforces transcript, parent and expanded CDS resource limits',()=>{
  const parents=Array.from({length:MODEL_LIMITS.parentsPerCds+1},(_,i)=>`tx${i}`).join(',');
  assert.throws(()=>predictConsequences({vcf:vcf(1,'A','C'),gff:`chr1\tx\tCDS\t1\t1\t.\t+\t0\tParent=${parents}\n`,fasta}),/parents/i);
  const transcripts=Array.from({length:MODEL_LIMITS.transcripts+1},(_,i)=>`chr1\tx\tmRNA\t1\t1\t.\t+\t.\tID=tx${i}`).join('\n');
  assert.throws(()=>predictConsequences({vcf:vcf(1,'A','C'),gff:transcripts,fasta}),/transcript limit/i);
  const longFasta=`>long\n${'A'.repeat(MODEL_LIMITS.cdsBasesPerTranscript+1)}\n`;
  const longVcf=vcf(1,'A','C').replaceAll('chr1','long');
  assert.throws(()=>predictConsequences({vcf:longVcf,gff:`long\tx\tCDS\t1\t${MODEL_LIMITS.cdsBasesPerTranscript+1}\t.\t+\t0\tParent=tx\n`,fasta:longFasta}),/CDS-base limit/i);
  const millionFasta=`>long\n${'A'.repeat(MODEL_LIMITS.cdsBasesPerTranscript)}\n`,manyParents='a,b,c,d,e,f';
  assert.throws(()=>predictConsequences({vcf:longVcf,gff:`long\tx\tCDS\t1\t${MODEL_LIMITS.cdsBasesPerTranscript}\t.\t+\t0\tParent=${manyParents}\n`,fasta:millionFasta}),/total expanded CDS-base limit/i);
});
