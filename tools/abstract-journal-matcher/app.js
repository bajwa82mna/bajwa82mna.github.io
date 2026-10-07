import {prepareQuery,signalStatus} from "./src/preprocess.js?v=10";
import {createSearch} from "./src/search.js?v=10";
import {toCsv,download} from "./src/export.js?v=10";
import {lookupEvidence,clearEvidenceCache} from "./src/api.js?v=10";
import {safeTextElement} from "../_shared/js/dom.js?v=10";
import {safeUrl} from "../_shared/js/safe-link.js?v=10";

const $=id=>document.getElementById(id), form=$("matcher"), resultBox=$("results"), status=$("status"), exportsBox=document.querySelector(".exports");
let profiles=[], results=[], lastPrepared=null;
const text=(tag,value,cls)=>safeTextElement(document,tag,value,cls);
const external=(label,href)=>{const url=safeUrl(href);if(!url)return text("span",label);const a=text("a",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a};

async function init(){
  try{profiles=await fetch("data/journal-profiles.min.json?v=10").then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()});status.textContent=`Ready: ${profiles.length} compact journal profiles loaded.`}
  catch(e){status.textContent=`Journal profiles could not be loaded: ${e.message}. Serve this folder over HTTP.`;form.querySelector("button[type=submit]").disabled=true}
}

function evidenceSummary(name,item){
  if(!item.ok)return `${name}: unavailable (${item.error})`;
  if(item.listed===false)return `${name}: ${item.note}`;
  if(name==="OpenAlex")return `OpenAlex: ${item.data.display_name||"record returned"}${item.data.is_oa?" · OA":""}`;
  if(name==="Crossref")return `Crossref: ${item.data.message?.title||"journal record returned"}`;
  return `DOAJ: ${item.data.total??item.data.totalResults??item.data.results?.length??0} matching record(s)`;
}

function resultCard(item,rank,max){
  const p=item.profile, card=document.createElement("article");card.className="result";
  const top=document.createElement("div");top.className="result-top";const head=document.createElement("div");head.append(text("p",p.category,"kicker"),text("h3",`${rank}. ${p.title}`));top.append(head,text("span",`Fit ${Math.round(100*item.score/max)}%`,"fit"));
  const meta=text("p",`${p.publisher} · ISSN ${p.issn}`,"meta"),tags=document.createElement("div");tags.className="tags";tags.append(text("span",p.oa?"Open access":"OA not confirmed locally",`tag ${p.oa?"oa":"unknown"}`),text("span",p.apc===false?"Declares no APC":p.apc===true?"APC declared":"APC unknown",`tag ${p.apc===false?"oa":"unknown"}`));
  const whyParts=[];if(item.explanation.topics.length)whyParts.push(`topics: ${item.explanation.topics.join(", ")}`);if(item.explanation.direct.length)whyParts.push(`terms: ${item.explanation.direct.join(", ")}`);if(item.explanation.expanded.length)whyParts.push(`expanded: ${item.explanation.expanded.join(", ")}`);
  const why=text("p",whyParts.length?`Why it matched — ${whyParts.join(" · ")}`:"Why it matched — broad lexical overlap; inspect the journal scope carefully.","why");
  const actions=document.createElement("div");actions.className="result-actions";actions.append(external("OpenAlex source search",`https://openalex.org/sources?search=${encodeURIComponent(p.issn)}`),external("DOAJ search",`https://doaj.org/search/journals?ref=homepage-box&source=%7B%22query%22%3A%7B%22query_string%22%3A%7B%22query%22%3A%22${encodeURIComponent(p.issn)}%22%7D%7D%7D`));
  const lookup=document.createElement("button");lookup.type="button";lookup.textContent="Refresh public evidence";const panel=document.createElement("div");panel.className="evidence";panel.hidden=true;lookup.onclick=async()=>{lookup.disabled=true;lookup.textContent="Checking…";panel.hidden=false;panel.textContent="Sending only the journal ISSN to OpenAlex, Crossref, and DOAJ…";const evidence=await lookupEvidence(p.issns||[p.issn]);const list=document.createElement("ul");Object.entries(evidence).forEach(([name,value])=>list.append(text("li",evidenceSummary(name,value))));panel.replaceChildren(text("strong",`Retrieved ${new Date().toLocaleString()}`),list);lookup.disabled=false;lookup.textContent="Refresh public evidence"};actions.append(lookup);
  card.append(top,meta,tags,why,actions,panel);return card;
}

function render(){
  const input={title:$("title").value,abstract:$("abstract").value,keywords:$("keywords").value,exclusions:$("exclude").value,expand:$("expand").checked};lastPrepared=prepareQuery(input);const signal=signalStatus(lastPrepared);
  if(signal.level==="low"){results=[];resultBox.replaceChildren();$("topics").replaceChildren();status.textContent=signal.message;exportsBox.hidden=true;return}
  const search=createSearch(window.MiniSearch,profiles);results=search(lastPrepared,{oa:$("oa").checked,noApc:$("no-apc").checked},{diverse:$("diverse").checked});
  status.textContent=results.length?`${signal.message} Showing ${results.length} plausible ${results.length===1?"journal":"journals"}; scores are relative to this shortlist.`:"No journals match these filters. Try unticking ‘No APC’ or ‘Open access’.";exportsBox.hidden=!results.length;
  $("topics").replaceChildren(...lastPrepared.groups.map(g=>text("span",`${g.name}: ${g.matches.slice(0,3).join(", ")}`)));
  const max=results[0]?.score||1;resultBox.replaceChildren(...results.map((r,i)=>resultCard(r,i+1,max)));
  if(!results.length)resultBox.append(text("p","No journals match these filters. Try unticking ‘No APC’ or ‘Open access’.","method-note"));
}
form.addEventListener("submit",e=>{e.preventDefault();render();$("results-section").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})});
$("example").onclick=()=>{$("title").value="Root architectural and transcriptomic responses improve drought tolerance in bread wheat";$("abstract").value="We combined field phenotyping and RNA sequencing to investigate drought-responsive root architecture in diverse Triticum aestivum cultivars. Water deficit altered root depth, abscisic acid signaling, photosynthesis and antioxidant responses. Candidate genes and quantitative trait loci were associated with yield stability under stress.";$("keywords").value="wheat, drought, root architecture, transcriptomics, crop improvement";render()};
$("clear").onclick=()=>{form.reset();$("title").value=$("abstract").value=$("keywords").value=$("exclude").value="";resultBox.replaceChildren();$("topics").replaceChildren();results=[];exportsBox.hidden=true;status.textContent="Text cleared from this page.";$("title").focus()};
$("csv").onclick=()=>download("journal-shortlist.csv",toCsv(results,{retrieved:new Date().toISOString()}),"text/csv");
$("json").onclick=()=>download("journal-shortlist.json",JSON.stringify({created:new Date().toISOString(),method:"MiniSearch 7.2.0 local lexical retrieval",settings:{expanded:$("expand").checked,diverse:$("diverse").checked,oaOnly:$("oa").checked,noApcOnly:$("no-apc").checked},topics:lastPrepared?.groups.map(g=>g.name),results},null,2),"application/json");
$("clear-cache").onclick=()=>{clearEvidenceCache();$("clear-cache").textContent="Evidence cache cleared"};
init();
