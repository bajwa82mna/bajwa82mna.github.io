import {applyFilters} from "./filters.js?v=18";
import {diversify} from "./rerank.js?v=18";
import {explain} from "./explain.js?v=18";

export function createSearch(MiniSearch, profiles) {
  const index = new MiniSearch({fields:["title","topicsText","termsText","category"],storeFields:["id"],searchOptions:{boost:{title:2.8,topicsText:2.2,termsText:1.2,category:1.1},prefix:true,fuzzy:0.12,combineWith:"OR"}});
  index.addAll(profiles.map(p=>({...p,topicsText:p.topics.join(" "),termsText:p.terms.join(" ")})));
  return (prepared, filters={}, options={}) => {
    const query=prepared.tokens.join(" ");
    if (!query.trim()) return [];
    const byId=new Map(profiles.map(p=>[p.id,p]));
    let results=index.search(query).map(r=>({score:r.score,profile:byId.get(r.id)})).filter(r=>r.profile);
    results=applyFilters(results,filters);
    results=results.map(r=>({...r,explanation:explain(r.profile,prepared)}));
    return options.diverse===false?results.slice(0,12):diversify(results,12,2);
  };
}
