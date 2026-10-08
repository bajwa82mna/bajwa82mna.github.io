const routes = {
  '/tools/journal-trust-profile/': {to: '/tools/journal-hub/', fixed: {mode: 'check'}},
  '/tools/oa-apc-explorer/': {to: '/tools/journal-hub/', fixed: {mode: 'apc'}},
  '/tools/abstract-journal-matcher/': {to: '/tools/journal-hub/', fixed: {mode: 'match'}},
  '/tools/journal-timing/': {to: '/tools/journal-hub/', fixed: {mode: 'timing'}},
  '/tools/emerging-journals-2026/': {to: '/tools/journal-hub/', fixed: {mode: 'trends'}},
  '/tools/reference-checker/': {to: '/tools/publishing-toolkit/', fixed: {mode: 'references'}},
  '/tools/identifier-toolkit/': {to: '/tools/publishing-toolkit/', fixed: {mode: 'identifiers'}},
  '/tools/dilution-calculator/': {to: '/tools/plant-lab-calculators/', fixed: {tab: 'dilution'}},
  '/tools/qpcr-ddct-calculator/': {to: '/tools/plant-lab-calculators/', fixed: {tab: 'qpcr'}},
  '/tools/reverse-complement/': {to: '/tools/plant-lab-calculators/', fixed: {tab: 'sequence'}},
};
const SAFE_PARAMS = ['q', 'journal', 'example'];

const source = new URL(location.href);
if (source.searchParams.get('embed') !== '1') {
  const route = routes[source.pathname];
  if (route) {
    const target = new URL(route.to, location.origin);
    for (const [name, value] of Object.entries(route.fixed)) target.searchParams.set(name, value);
    for (const name of SAFE_PARAMS) {
      const value = source.searchParams.get(name);
      if (value !== null && (name !== 'example' || value === '1')) target.searchParams.set(name, value);
    }
    location.replace(`${target.pathname}${target.search}${target.hash}`);
  }
}
