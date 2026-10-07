const TTL=30*864e5, MAIL="contact@smbajwa.com";
function key(provider,issn){return `ajm:v1:${provider}:${issn}`}
function cached(provider,issn){try{const x=JSON.parse(localStorage.getItem(key(provider,issn)));return x&&Date.now()-x.at<TTL?x.data:null}catch{return null}}
function save(provider,issn,data){try{localStorage.setItem(key(provider,issn),JSON.stringify({at:Date.now(),data}))}catch{}}
async function get(provider,issn,url,signal){const hit=cached(provider,issn);if(hit)return {...hit,cached:true};const res=await fetch(url,{signal,headers:{Accept:"application/json"}});if(!res.ok)throw new Error(`${provider} returned HTTP ${res.status}`);const data=await res.json();save(provider,issn,data);return data}
export async function lookupEvidence(issn,signal){
  const q=encodeURIComponent(issn);
  const tasks={
    OpenAlex:get("OpenAlex",issn,`https://api.openalex.org/sources/issn:${q}?mailto=${MAIL}`,signal),
    Crossref:get("Crossref",issn,`https://api.crossref.org/journals/${q}?mailto=${MAIL}`,signal),
    DOAJ:get("DOAJ",issn,`https://doaj.org/api/search/journals/issn:${q}?pageSize=1`,signal)
  };
  const pairs=await Promise.all(Object.entries(tasks).map(async ([name,p])=>{try{return [name,{ok:true,data:await p}]}catch(e){return [name,{ok:false,error:e.message}]}}));
  return Object.fromEntries(pairs);
}
export function clearEvidenceCache(){for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith("ajm:v1:"))localStorage.removeItem(k)}}
