import {GENERIC, detectGroups, expansionTerms} from "./plant-terms.js?v=25";

export function normalizeText(value="") {
  return value.normalize("NFKC").toLowerCase().replace(/[‐‑‒–—]/g,"-").replace(/([a-z])-(?=[a-z])/g,"$1 ").replace(/[^\p{L}\p{N}+.-]+/gu," ").replace(/\s+/g," ").trim();
}

export function tokenize(value="", exclusions=[]) {
  const excluded = new Set(exclusions.map(normalizeText));
  return normalizeText(value).split(" ").filter(t => t.length > 2 && !GENERIC.has(t) && !excluded.has(t));
}

export function prepareQuery({title="", abstract="", keywords="", exclusions="", expand=true}={}) {
  const excluded = tokenize(exclusions);
  const titleTokens = tokenize(title, excluded);
  const abstractTokens = tokenize(abstract, excluded);
  const keywordTokens = tokenize(keywords, excluded);
  const base = [...titleTokens, ...titleTokens, ...keywordTokens, ...keywordTokens, ...abstractTokens];
  const groups = detectGroups(base);
  const expanded = expand ? expansionTerms(groups).filter(t => !excluded.includes(t)) : [];
  return {tokens:[...base,...expanded], titleTokens, keywordTokens, groups, expanded, excluded};
}

export function signalStatus(prepared) {
  const unique = new Set(prepared.tokens);
  if (unique.size < 6) return {level:"low", message:"Too little topical signal. Add a title, abstract, or several specific keywords."};
  if (!prepared.groups.length) return {level:"outside", message:"Few plant-science signals were found. Results may be broad or out of domain."};
  return {level:"good", message:`${prepared.groups.length} plant-science topic ${prepared.groups.length===1?"group":"groups"} detected.`};
}
