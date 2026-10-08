const MONTHS=new Map('january february march april may june july august september october november december'.split(' ').map((x,i)=>[x,i+1]));
for(const [name,n] of [...MONTHS])MONTHS.set(name.slice(0,3),n);

function calendarDate(year,month,day){
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?date:null;
}

export function parseDate(value){
  if(value&&typeof value==='object'){
    const parts=value['date-parts']?.[0];
    if(!Array.isArray(parts)||parts.length<3)return null;
    return calendarDate(Number(parts[0]),Number(parts[1]),Number(parts[2]));
  }
  const text=String(value??'').trim();let match;
  if((match=text.match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/))){
    const month=MONTHS.get(match[2].toLowerCase());return month?calendarDate(Number(match[3]),month,Number(match[1])):null;
  }
  if((match=text.match(/^(\d{4})-(\d{2})-(\d{2})$/)))return calendarDate(...match.slice(1).map(Number));
  if((match=text.match(/^(\d{2})-(\d{2})-(\d{4})$/)))return calendarDate(Number(match[3]),Number(match[2]),Number(match[1]));
  return null;
}

function assertionDate(work,label){
  const wanted=label.toLowerCase();
  for(const item of work.assertion||[]){
    if(String(item.label||item.name||'').trim().toLowerCase()===wanted){const date=parseDate(item.value);if(date)return date;}
  }
  return null;
}
function publishedDate(work){return parseDate(work['published-online'])||parseDate(work.published);}
const days=(later,earlier)=>(later-earlier)/86400000;

export function intervals(work){
  const received=assertionDate(work,'received'),accepted=assertionDate(work,'accepted'),online=publishedDate(work);
  const present=[received,accepted,online].filter(Boolean);
  if(present.some((date,index)=>index&&date<present[index-1]))return [null,true];
  if(present.length&&days(new Date(Math.max(...present)),new Date(Math.min(...present)))>3650)return [null,true];
  return [{sa:received&&accepted?days(accepted,received):null,ao:accepted&&online?days(online,accepted):null,
    so:received&&online?days(online,received):null,year:online?online.getUTCFullYear():null},false];
}

export function percentile(values,fraction){
  const sorted=[...values].sort((a,b)=>a-b);if(!sorted.length)return null;
  const position=(sorted.length-1)*fraction,lo=Math.floor(position),hi=Math.min(lo+1,sorted.length-1);
  return sorted[lo]+(sorted[hi]-sorted[lo])*(position-lo);
}
function pyRound(value){const floor=Math.floor(value),fraction=value-floor;return fraction===.5?(floor%2===0?floor:floor+1):Math.round(value);}
export function summarize(works,minimum=10){
  const valid=[];let rejected=0;
  for(const work of works){const [row,bad]=intervals(work);if(bad)rejected++;if(row&&['sa','ao','so'].some(key=>row[key]!==null))valid.push(row);}
  const metric=key=>{const values=valid.map(x=>x[key]).filter(x=>x!==null);return {n:values.length,
    median:values.length>=minimum?pyRound(percentile(values,.5)):null,
    iqr:values.length>=minimum?[pyRound(percentile(values,.25)),pyRound(percentile(values,.75))]:null};};
  const years=valid.map(x=>x.year).filter(Boolean);
  return {submit_accept:metric('sa'),accept_online:metric('ao'),submit_online:metric('so'),n:valid.length,
    years:years.length?[Math.min(...years),Math.max(...years)]:[],rejected};
}
