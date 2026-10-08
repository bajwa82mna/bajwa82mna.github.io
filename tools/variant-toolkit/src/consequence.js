import {parseVcfRecords,MAX_BYTES} from './vcf.js?v=19';

const complement={A:'T',T:'A',C:'G',G:'C',N:'N'};
const reverseComplement=s=>[...s.toUpperCase()].reverse().map(x=>complement[x]||'N').join('');
const CODE={TTT:'F',TTC:'F',TTA:'L',TTG:'L',TCT:'S',TCC:'S',TCA:'S',TCG:'S',TAT:'Y',TAC:'Y',TAA:'*',TAG:'*',TGT:'C',TGC:'C',TGA:'*',TGG:'W',CTT:'L',CTC:'L',CTA:'L',CTG:'L',CCT:'P',CCC:'P',CCA:'P',CCG:'P',CAT:'H',CAC:'H',CAA:'Q',CAG:'Q',CGT:'R',CGC:'R',CGA:'R',CGG:'R',ATT:'I',ATC:'I',ATA:'I',ATG:'M',ACT:'T',ACC:'T',ACA:'T',ACG:'T',AAT:'N',AAC:'N',AAA:'K',AAG:'K',AGT:'S',AGC:'S',AGA:'R',AGG:'R',GTT:'V',GTC:'V',GTA:'V',GTG:'V',GCT:'A',GCC:'A',GCA:'A',GCG:'A',GAT:'D',GAC:'D',GAA:'E',GAG:'E',GGT:'G',GGC:'G',GGA:'G',GGG:'G'};
export const MODEL_LIMITS={transcripts:1000,parentsPerCds:100,cdsBasesPerTranscript:1_000_000,totalExpandedCdsBases:5_000_000};

function sized(text,label){if(new TextEncoder().encode(text).length>MAX_BYTES)throw new RangeError(`${label} exceeds the 2 MB limit`)}
function parseFasta(text){
  sized(text,'FASTA');const seqs={};let id=null;
  for(const raw of text.replace(/\r/g,'').split('\n')){if(raw.startsWith('>')){id=raw.slice(1).trim().split(/\s+/)[0];if(!id)throw new Error('FASTA header lacks an identifier');seqs[id]='';}else if(raw.trim()){if(!id)throw new Error('FASTA sequence appears before a header');seqs[id]+=raw.trim().toUpperCase();}}
  for(const [name,seq] of Object.entries(seqs))if(!/^[ACGTN]+$/.test(seq))throw new Error(`FASTA ${name} contains unsupported characters`);
  return seqs;
}
function attrs(s){return Object.fromEntries(s.split(';').filter(Boolean).map(x=>{const p=x.indexOf('=');return p<0?[x,'']:[x.slice(0,p),decodeURIComponent(x.slice(p+1))]}))}
function parseGff(text,seqs){
  sized(text,'GFF3');const transcripts=new Map;let totalBases=0;
  const model=(id,chrom,strand,line)=>{
    const existing=transcripts.get(id);
    if(existing){
      if(existing.chrom!==chrom)throw new Error(`GFF3 line ${line}: transcript ${id} uses inconsistent contigs`);
      if(existing.strand!==strand)throw new Error(`GFF3 line ${line}: transcript ${id} uses inconsistent strands`);
      return existing;
    }
    if(transcripts.size>=MODEL_LIMITS.transcripts)throw new RangeError(`GFF3 exceeds the ${MODEL_LIMITS.transcripts.toLocaleString()} transcript limit`);
    const created={id,chrom,strand,cds:[],cdsBases:0};transcripts.set(id,created);return created;
  };
  for(const [i,line] of text.replace(/\r/g,'').split('\n').entries()){
    if(!line||line.startsWith('#'))continue;const f=line.split('\t');if(f.length!==9)throw new Error(`GFF3 line ${i+1} does not have 9 columns`);
    const lineNumber=i+1,a=attrs(f[8]),relevant=['mRNA','transcript','CDS'].includes(f[2]);
    if(!relevant)continue;
    const start=Number(f[3]),end=Number(f[4]);
    if(!f[0])throw new Error(`GFF3 line ${lineNumber}: contig must not be empty`);
    if(f[6]!=='+'&&f[6]!=='-')throw new Error(`GFF3 line ${lineNumber}: strand must be + or -`);
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<1||end<start)throw new Error(`GFF3 line ${lineNumber}: coordinates must be safe integers with 1 <= start <= end`);
    if(seqs[f[0]]&&end>seqs[f[0]].length)throw new Error(`GFF3 line ${lineNumber}: end exceeds FASTA contig ${f[0]} length ${seqs[f[0]].length}`);
    if(!seqs[f[0]])throw new Error(`GFF3 line ${lineNumber}: FASTA has no sequence named ${f[0]}`);
    if(['mRNA','transcript'].includes(f[2])){
      if(!a.ID?.trim())throw new Error(`GFF3 line ${lineNumber}: transcript ID must not be empty`);
      model(a.ID.trim(),f[0],f[6],lineNumber);
    }
    if(f[2]==='CDS'){
      if(f[7]!=='0')throw new Error(`GFF3 line ${lineNumber}: experimental predictor currently requires phase 0 for every CDS row`);
      const rawParents=(a.Parent||'').split(',');
      if(!a.Parent||rawParents.some(parent=>!parent.trim()))throw new Error(`GFF3 line ${lineNumber}: CDS Parent must contain nonempty transcript IDs`);
      if(rawParents.length>MODEL_LIMITS.parentsPerCds)throw new RangeError(`GFF3 line ${lineNumber}: CDS has more than ${MODEL_LIMITS.parentsPerCds} parents`);
      const length=end-start+1;
      for(const rawParent of rawParents){
        const parent=rawParent.trim(),transcript=model(parent,f[0],f[6],lineNumber);
        const transcriptBases=transcript.cdsBases+length;
        if(transcriptBases>MODEL_LIMITS.cdsBasesPerTranscript)throw new RangeError(`Transcript ${parent} exceeds the ${MODEL_LIMITS.cdsBasesPerTranscript.toLocaleString()} CDS-base limit`);
        totalBases+=length;
        if(totalBases>MODEL_LIMITS.totalExpandedCdsBases)throw new RangeError(`GFF3 exceeds the ${MODEL_LIMITS.totalExpandedCdsBases.toLocaleString()} total expanded CDS-base limit`);
        transcript.cdsBases=transcriptBases;transcript.cds.push({start,end,line:lineNumber});
      }
    }
  }
  for(const transcript of transcripts.values()){
    const genomic=[...transcript.cds].sort((a,b)=>a.start-b.start||a.end-b.end);
    for(let i=1;i<genomic.length;i++)if(genomic[i].start<=genomic[i-1].end)throw new Error(`GFF3 line ${genomic[i].line}: CDS segments overlap in transcript ${transcript.id}`);
  }
  return [...transcripts.values()].filter(t=>t.cds.length);
}
function buildTranscript(t,seq){
  if(!seq)throw new Error(`FASTA has no sequence named ${t.chrom}`);
  const segments=[...t.cds].sort((a,b)=>t.strand==='-'?b.start-a.start:a.start-b.start),parts=[];let offset=0;
  for(const s of segments){const raw=seq.slice(s.start-1,s.end),length=s.end-s.start+1;parts.push(t.strand==='-'?reverseComplement(raw):raw);s.offset=offset;s.length=length;offset+=length;}
  return {...t,segments,genomicSegments:[...segments].sort((a,b)=>a.start-b.start),sequence:parts.join('')};
}
function intervalAt(t,pos){let low=0,high=t.genomicSegments.length-1;while(low<=high){const mid=(low+high)>>1,s=t.genomicSegments[mid];if(pos<s.start)high=mid-1;else if(pos>s.end)low=mid+1;else return s}return null}
function transcriptOffset(t,pos){const s=intervalAt(t,pos);return s?(t.strand==='-'?s.offset+s.end-pos:s.offset+pos-s.start):-1}
function overlapsRange(t,start,end){let low=0,high=t.genomicSegments.length-1,candidate=t.genomicSegments.length;while(low<=high){const mid=(low+high)>>1;if(t.genomicSegments[mid].end>=start){candidate=mid;high=mid-1}else low=mid+1}return candidate<t.genomicSegments.length&&t.genomicSegments[candidate].start<end}
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
  const seqs=parseFasta(fasta),transcripts=parseGff(gff,seqs).map(t=>buildTranscript(t,seqs[t.chrom])),results=[];
  for(const r of parsed.records)for(const alt of r.alts){
    if(!/^[ACGT]+$/.test(r.ref)||!/^[ACGT]+$/.test(alt))throw new Error('Only simple DNA alleles are supported; symbolic alleles are not');
    const genome=seqs[r.chrom];if(!genome)throw new Error(`FASTA has no sequence named ${r.chrom}`);
    if(genome.slice(r.pos-1,r.pos-1+r.ref.length)!==r.ref)throw new Error(`VCF line ${r.line}: reference allele does not match FASTA`);
    const overlaps=transcripts.filter(t=>t.chrom===r.chrom&&(overlapsRange(t,r.pos,r.pos+r.ref.length)||nearSplice(t,r.pos)));
    if(!overlaps.length){results.push({chrom:r.chrom,pos:r.pos,ref:r.ref,alt,transcript:'—',consequence:'outside_supplied_model',experimental:true});continue;}
    for(const t of overlaps){
      const affected=[];for(let p=r.pos;p<r.pos+r.ref.length;p++){const idx=transcriptOffset(t,p);if(idx>=0)affected.push(idx);}
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
