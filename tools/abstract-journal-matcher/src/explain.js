import {normalizeText} from "./preprocess.js?v=23";
export function explain(profile, prepared) {
  const searchable=normalizeText([profile.title,profile.category,...profile.topics,...profile.terms].join(" "));
  const direct=[...new Set([...prepared.titleTokens,...prepared.keywordTokens,...prepared.tokens])].filter(t=>searchable.includes(t)).slice(0,10);
  const topics=profile.topics.filter(topic=>prepared.groups.some(g=>g.name===topic));
  return {direct, topics, expanded:prepared.expanded.filter(t=>searchable.includes(t)).slice(0,6)};
}
