export const MAX_BYTES=2*1024*1024;
const DNA=/^[ACGTN]+$/i;

export function parseVcfRecords(text,{maxBytes=MAX_BYTES}={}){
  if(new TextEncoder().encode(text).length>maxBytes) throw new RangeError('VCF exceeds the 2 MB limit');
  const lines=text.replace(/\r/g,'').split('\n'),malformed=[];
  let header=false;
  const records=[];
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(!line.trim()) continue;
    if(line.startsWith('##')) continue;
    if(line.startsWith('#CHROM')){header=true;continue;}
    if(line.startsWith('#')) continue;
    if(!header){malformed.push({line:i+1,message:'VCF #CHROM header must appear before records'});continue;}
    const f=line.split('\t');
    if(f.length<8){malformed.push({line:i+1,message:'Expected at least 8 tab-separated columns'});continue;}
    const pos=Number(f[1]),ref=f[3].toUpperCase(),alts=f[4].split(',').map(x=>x.toUpperCase());
    if(!Number.isSafeInteger(pos)||pos<1){malformed.push({line:i+1,message:'POS must be a positive integer'});continue;}
    if(!DNA.test(ref)||alts.some(a=>!DNA.test(a))){malformed.push({line:i+1,message:'REF and ALT must be non-empty DNA alleles (A, C, G, T or N)'});continue;}
    records.push({chrom:f[0],pos,ref,alts,line:i+1});
  }
  if(!header&&!malformed.length) malformed.push({line:1,message:'Missing required #CHROM VCF header'});
  return {records,malformed};
}

export function summarizeVcf(text,options){
  const {records,malformed}=parseVcfRecords(text,options);
  const out={valid:malformed.length===0,records:records.length,alleles:0,snps:0,indels:0,other:0,multiallelic:0,transitions:0,transversions:0,tsTv:null,chromosomes:{},malformed};
  const transitions=new Set(['AG','GA','CT','TC']);
  for(const r of records){
    out.chromosomes[r.chrom]=(out.chromosomes[r.chrom]||0)+1;
    if(r.alts.length>1) out.multiallelic++;
    for(const alt of r.alts){
      out.alleles++;
      if(r.ref.length===1&&alt.length===1){out.snps++;if(transitions.has(r.ref+alt))out.transitions++;else out.transversions++;}
      else if(r.ref.length!==alt.length) out.indels++;
      else out.other++;
    }
  }
  out.tsTv=out.transversions?out.transitions/out.transversions:null;
  return out;
}
