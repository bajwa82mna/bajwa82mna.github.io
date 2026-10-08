const concentration={M:1,mM:1e-3,uM:1e-6,nM:1e-9,'mg/mL':1,'ug/mL':1e-3,'%':10};
const volume={L:1,mL:1e-3,uL:1e-6};
const family=unit=>['M','mM','uM','nM'].includes(unit)?'molar':'mass';
export function solveDilution(input){
  const missing=['c1','v1','c2','v2'].filter(key=>input[key]===null||input[key]==='');
  if(missing.length!==1)throw new Error('Leave exactly one value unknown.');
  if(family(input.c1Unit)!==family(input.c2Unit))throw new Error('Concentration units must be compatible; mass and molar units require molecular weight to convert.');
  const x={c1:Number(input.c1)*concentration[input.c1Unit],v1:Number(input.v1)*volume[input.v1Unit],c2:Number(input.c2)*concentration[input.c2Unit],v2:Number(input.v2)*volume[input.v2Unit]};
  if(Object.entries(x).some(([key,value])=>key!==missing[0]&&(!Number.isFinite(value)||value<=0)))throw new Error('Known values must be positive numbers.');
  const formulas={c1:()=>x.c2*x.v2/x.v1,v1:()=>x.c2*x.v2/x.c1,c2:()=>x.c1*x.v1/x.v2,v2:()=>x.c1*x.v1/x.c2};
  const base=formulas[missing[0]]();x[missing[0]]=base;
  if(x.c2>x.c1)throw new Error('Final concentration cannot be higher than stock concentration by dilution.');
  if(x.v1>x.v2)throw new Error('Stock volume cannot be higher than final volume in a dilution.');
  const unit=input[`${missing[0]}Unit`],factor=missing[0].startsWith('c')?concentration[unit]:volume[unit];
  return {unknown:missing[0],value:base/factor,diluent:missing[0]==='v1'?(x.v2-x.v1)/volume[input.v2Unit]:null};
}
export function serialDilution({factor,steps,finalVolume}){
  factor=Number(factor);steps=Number(steps);finalVolume=Number(finalVolume);
  if(!(factor>1)||!Number.isInteger(steps)||steps<1||!(finalVolume>0))throw new Error('Use a factor above 1, whole steps, and a positive final volume.');
  const transfer=finalVolume/factor;
  return Array.from({length:steps},(_,i)=>({step:i+1,transfer,diluent:finalVolume-transfer,relative:factor**-(i+1)}));
}
