const routes = {
  '/tools/journal-trust-profile/': {to: '/tools/journal-hub/', fixed: {mode: 'check'}, keep: ['q', 'example']},
  '/tools/oa-apc-explorer/': {to: '/tools/journal-hub/', fixed: {mode: 'apc'}, keep: ['q', 'example']},
  '/tools/abstract-journal-matcher/': {to: '/tools/journal-hub/', fixed: {mode: 'match'}, keep: ['q', 'example']},
  '/tools/journal-timing/': {to: '/tools/journal-hub/', fixed: {mode: 'timing'}, keep: ['q', 'example']},
  '/tools/emerging-journals-2026/': {to: '/tools/journal-hub/', fixed: {mode: 'trends'}, keep: ['q', 'journal', 'example']},
  '/tools/reference-checker/': {to: '/tools/publishing-toolkit/', fixed: {mode: 'references'}, keep: ['q', 'example']},
  '/tools/identifier-toolkit/': {to: '/tools/publishing-toolkit/', fixed: {mode: 'identifiers'}, keep: ['q', 'example']},
  '/tools/dilution-calculator/': {to: '/tools/plant-lab-calculators/', fixed: {tab: 'dilution'}, keep: ['example']},
  '/tools/qpcr-ddct-calculator/': {to: '/tools/plant-lab-calculators/', fixed: {tab: 'qpcr'}, keep: ['example']},
  '/tools/reverse-complement/': {to: '/tools/plant-lab-calculators/', fixed: {tab: 'sequence'}, keep: ['example']},
};

const source = new URL(location.href);
if (source.searchParams.get('embed') !== '1') {
  const route = routes[source.pathname];
  if (route) {
    const target = new URL(route.to, location.origin);
    for (const [name, value] of Object.entries(route.fixed)) target.searchParams.set(name, value);
    for (const name of route.keep) {
      const value = source.searchParams.get(name);
      if (value !== null && (name !== 'example' || value === '1')) target.searchParams.set(name, value);
    }
    location.replace(`${target.pathname}${target.search}${target.hash}`);
  }
}
