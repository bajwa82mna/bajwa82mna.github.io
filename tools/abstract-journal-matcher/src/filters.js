export function applyFilters(items, filters={}) {
  return items.filter(({profile}) => (!filters.oa || profile.oa===true) && (!filters.noApc || profile.apc===false) && (!filters.category || profile.category===filters.category));
}
