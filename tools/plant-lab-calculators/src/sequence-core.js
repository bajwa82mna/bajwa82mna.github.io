const DNA={A:'T',T:'A',U:'A',C:'G',G:'C',R:'Y',Y:'R',S:'S',W:'W',K:'M',M:'K',B:'V',V:'B',D:'H',H:'D',N:'N'};
const RNA={...DNA,A:'U',U:'A'};
export function transformSequence(text,{rna=false}={}){
  const records=[];let name='sequence',parts=[];
  const flush=()=>{if(!parts.length)return;const sequence=parts.join('').replace(/\s+/g,'').toUpperCase(),map=rna?RNA:DNA,invalid=[...sequence].filter(x=>!map[x]);if(invalid.length)throw new Error(`Invalid sequence character: ${[...new Set(invalid)].join(', ')}`);const complement=[...sequence].map(x=>map[x]).join('');records.push({name,sequence,complement,reverse:[...sequence].reverse().join(''),reverseComplement:[...complement].reverse().join(''),transcript:rna?sequence.replaceAll('U','T'):sequence.replaceAll('T','U'),length:sequence.length,gc:sequence.length?100*[...sequence].filter(x=>x==='G'||x==='C').length/sequence.length:0});parts=[]};
  for(const line of String(text).split(/\r?\n/)){if(line.startsWith('>')){flush();name=line.slice(1).trim()||'sequence'}else parts.push(line)}flush();if(!records.length)throw new Error('Enter at least one sequence.');return {records};
}
