export function diversify(items, limit=12, maxPublisher=2) {
  const counts = new Map(), selected=[];
  for (const item of items) {
    const publisher=(item.profile.publisher||"Independent").toLowerCase();
    if ((counts.get(publisher)||0) >= maxPublisher) continue;
    selected.push(item); counts.set(publisher,(counts.get(publisher)||0)+1);
    if (selected.length===limit) break;
  }
  return selected;
}
