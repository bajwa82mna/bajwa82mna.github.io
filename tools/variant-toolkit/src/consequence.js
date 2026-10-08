import {parseVcfRecords,MAX_BYTES} from './vcf.js?v=15';

const complement={A:'T',T:'A',C:'G',G:'C',N:'N'};
const reverseComplement=s=>[...s.toUpperCase()].reverse().map(x=>complement[x]||'N').join('');
const CODE={TTT:'F',TTC:'F',TTA:'L',TTG:'L',TCT:'S',TCC:'S',TCA:'S',TCG:'S',TAT:'Y',TAC:'Y',TAA:'*',TAG:'*',TGT:'C',TGC:'C',TGA:'*',TGG:'W',CTT:'L',CTC:'L',CTA:'L',CTG:'L',CCT:'P',CCC:'P',CCA:'P',CCG:'P',CAT:'H',CAC:'H',CAA:'Q',CAG:'Q',CGT:'R',CGC:'R',CGA:'R',CGG:'R',ATT:'I',ATC:'I',ATA:'I',ATG:'M',ACT:'T',ACC:'T',ACA:'T',ACG:'T',AAT:'N',AAC:'N',AAA:'K',AAG:'K',AGT:'S',AGC:'S',AGA:'R',AGG:'R',GTT:'V',GTC:'V',GTA:'V',GTG:'V',GCT:'A',GCC:'A',GCA:'A',GCG:'A',GAT:'D',GAC:'D',GAA:'E',GAG:'E',GGT:'G',GGC:'G',GGA:'G',GGG:'G'};

function sized(text,label){if(new TextEncoder().encode(text).length>MAX_BYTES)throw new RangeError(`${label} exceeds the 2 MB limit`)}
function parseFasta(text){
  sized(text,'FASTA');const seqs={};let id=null;
  for(const raw of text.replace(/\r/g,'').split('\n')){if(raw.startsWith('>')){id=raw.slice(1).trim().split(/\s+/)[0];if(!id)throw new Error('FASTA header lacks an identifier');seqs[id]='';}else if(raw.trim()){if(!id)throw new Error('FASTA sequence appears before a header');seqs[id]+=raw.trim().toUpperCase();}}
  for(const [name,seq] of Object.entries(seqs))if(!/^[ACGTN]+$/.test(seq))throw new Error(`FASTA ${name} contains unsupported characters`);
  return seqs;
}
function attrs(s){return Object.fromEntries(s.split(';').filter(Boolean).map(x=>{const p=x.indexOf('=');return p<0?[x,'']:[x.slice(0,p),decodeURIComponent(x.slice(p+1))]}))}
function parseGff(text){
  sized(text,'GFF3');const transcripts=new Map;
  for(const [i,line] of text.replace(/\r/g,'').split('\n').entries()){
    if(!line||line.startsWith('#'))continue;const f=line.split('\t');if(f.length!==9)throw new Error(`GFF3 line ${i+1} does not have 9 columns`);
    const a=attrs(f[8]);
    if(['mRNA','transcript'].includes(f[2]))transcripts.set(a.ID,{id:a.ID,chrom:f[0],strand:f[6],cds:[]});
    if(f[2]==='CDS'){
      if(f[7]!=='0')throw new Error('Experimental predictor currently requires phase 0 for every CDS row');
      for(const parent of (a.Parent||'').split(',').filter(Boolean)){
        if(!transcripts.has(parent))transcripts.set(parent,{id:parent,chrom:f[0],strand:f[6],cds:[]});
        transcripts.get(parent).cds.push({start:Number(f[3]),end:Number(f[4])});
      }
    }
  }
  return [...transcripts.values()].filter(t=>t.cds.length);
}
function buildTranscript(t,seq){
  if(!seq)throw new Error(`FASTA has no sequence named ${t.chrom}`);
  const segments=[...t.cds].sort((a,b)=>t.strand==='-'?b.start-a.start:a.start-b.start),map=[],parts=[];
  for(const s of segments){const raw=seq.slice(s.start-1,s.end);parts.push(t.strand==='-'?reverseComplement(raw):raw);if(t.strand==='-')for(let p=s.end;p>=s.start;p--)map.push(p);else for(let p=s.start;p<=s.end;p++)map.push(p);}
  return {...t,segments,sequence:parts.join(''),map};
}
function classify(before,after,ref,alt,index){
  const delta=alt.length-ref.length;
  if(delta!==0){if(Math.abs(delta)%3)return 'frameshift_variant';return delta>0?'inframe_insertion':'inframe_deletion';}
  const codonStart=Math.floor(index/3)*3,oldAa=CODE[before.slice(codonStart,codonStart+3)],newAa=CODE[after.slice(codonStart,codonStart+3)];
  if(!oldAa||!newAa) return 'coding_sequence_variant';
  if(oldAa===newAa)return 'synonymous_variant';
  if(newAa==='*'&&oldAa!=='*')return 'stop_gained';
  if(oldAa==='*'&&newAa!=='*')return 'stop_lost';
  return 'missense_variant';
}
function nearSplice(t,pos){return t.segments.some(s=>(pos>=s.start-2&&pos<s.start)||(pos>s.end&&pos<=s.end+2));}

export function predictConsequences({vcf,gff,fasta}){
  const parsed=parseVcfRecords(vcf);if(parsed.malformed.length)throw new Error(`VCF line ${parsed.malformed[0].line}: ${parsed.malformed[0].message}`);
  const seqs=parseFasta(fasta),transcripts=parseGff(gff).map(t=>buildTranscript(t,seqs[t.chrom])),results=[];
  for(const r of parsed.records)for(const alt of r.alts){
    if(!/^[ACGT]+$/.test(r.ref)||!/^[ACGT]+$/.test(alt))throw new Error('Only simple DNA alleles are supported; symbolic alleles are not');
    const genome=seqs[r.chrom];if(!genome)throw new Error(`FASTA has no sequence named ${r.chrom}`);
    if(genome.slice(r.pos-1,r.pos-1+r.ref.length)!==r.ref)throw new Error(`VCF line ${r.line}: reference allele does not match FASTA`);
    const overlaps=transcripts.filter(t=>t.chrom===r.chrom&&(t.map.some(p=>p>=r.pos&&p<r.pos+r.ref.length)||nearSplice(t,r.pos)));
    if(!overlaps.length){results.push({chrom:r.chrom,pos:r.pos,ref:r.ref,alt,transcript:'—',consequence:'outside_supplied_model',experimental:true});continue;}
    for(const t of overlaps){
      const affected=[];for(let p=r.pos;p<r.pos+r.ref.length;p++){const idx=t.map.indexOf(p);if(idx>=0)affected.push(idx);}
      let consequence='splice_site_variant';
      if(affected.length===r.ref.length){
        affected.sort((a,b)=>a-b);if(affected.at(-1)-affected[0]+1!==affected.length)throw new Error('Variant crosses a spliced CDS boundary; this case is unsupported');
        const cRef=t.strand==='-'?reverseComplement(r.ref):r.ref,cAlt=t.strand==='-'?reverseComplement(alt):alt,index=affected[0];
        if(t.sequence.slice(index,index+cRef.length)!==cRef)throw new Error('Reference allele is inconsistent with the spliced CDS');
        const changed=t.sequence.slice(0,index)+cAlt+t.sequence.slice(index+cRef.length);consequence=classify(t.sequence,changed,cRef,cAlt,index);
      }
      results.push({chrom:r.chrom,pos:r.pos,ref:r.ref,alt,transcript:t.id,consequence,spliceSite:nearSplice(t,r.pos),experimental:true});
    }
  }
  return results;
}
