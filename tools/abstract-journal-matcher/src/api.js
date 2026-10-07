const TTL=30*864e5, MAIL="contact@smbajwa.com";
function key(provider,issn){return `ajm:v1:${provider}:${issn}`}
function cached(provider,issn){try{const x=JSON.parse(localStorage.getItem(key(provider,issn)));return x&&Date.now()-x.at<TTL?x.data:null}catch{return null}}
function save(provider,issn,data){try{localStorage.setItem(key(provider,issn),JSON.stringify({at:Date.now(),data}))}catch{}}
async function get(provider,issn,url,signal,fetcher=fetch){const hit=cached(provider,issn);if(hit)return {...hit,cached:true};const res=await fetcher(url,{signal,headers:{Accept:"application/json"}});if(!res.ok){const error=new Error(`${provider} returned HTTP ${res.status}`);error.status=res.status;throw error}const data=await res.json();save(provider,issn,data);return data}
export async function lookupCrossrefIssns(issns,signal,fetcher=fetch){
  for(const issn of issns){const q=encodeURIComponent(issn);try{return {ok:true,data:await get("Crossref",issn,`https://api.crossref.org/journals/${q}?mailto=${MAIL}`,signal,fetcher)}}catch(error){if(error.status===404)continue;return {ok:false,error:error.message}}}
  return {ok:true,listed:false,note:"Not listed in Crossref for this ISSN"};
}
export async function lookupEvidence(input,signal){
  const issns=[...new Set((Array.isArray(input)?input:[input]).filter(Boolean))],issn=issns[0],q=encodeURIComponent(issn);
  const tasks={
    OpenAlex:get("OpenAlex",issn,`https://api.openalex.org/sources/issn:${q}?mailto=${MAIL}`,signal),
    Crossref:lookupCrossrefIssns(issns,signal),
    DOAJ:get("DOAJ",issn,`https://doaj.org/api/search/journals/issn:${q}?pageSize=1`,signal)
  };
  const pairs=await Promise.all(Object.entries(tasks).map(async ([name,p])=>{try{const data=await p;return [name,name==="Crossref"?data:{ok:true,data}]}catch(e){return [name,{ok:false,error:e.message}]}}));
  return Object.fromEntries(pairs);
}
export function clearEvidenceCache(){for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith("ajm:v1:"))localStorage.removeItem(k)}}
