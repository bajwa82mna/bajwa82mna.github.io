const tabs = [...document.querySelectorAll('[role="tab"]')];
const mounts = [...document.querySelectorAll('iframe[data-src]')];
const compareTools = ['journal-trust-profile', 'oa-apc-explorer', 'journal-timing', 'emerging-journals-2026'];
let hasSelection = false;

window.EmbedBridge.mountFrames(mounts);

let exampleRequested = new URLSearchParams(location.search).get('example') === '1';

function withQuery(source, query) {
  const url = new URL(source, location.href);
  if (query) url.searchParams.set('q', query);
  if (exampleRequested && !query) { url.searchParams.set('example', '1'); exampleRequested = false; }
  return `${url.pathname}${url.search}`;
}

function loadMount(frame, query = '') {
  if (!frame.getAttribute('src')) frame.src = withQuery(frame.dataset.src, query);
}

function showComparisonFrames() {
  if (!hasSelection) return;
  mounts.filter(frame => compareTools.includes(frame.dataset.tool)).forEach(frame => {
    const panel = frame.closest('section');
    panel.hidden = false;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', `${frame.title} comparison view`);
    panel.classList.add('comparison-source');
    loadMount(frame);
  });
}

function activate(mode, {focus = false, update = true} = {}) {
  const selected = tabs.find(tab => tab.dataset.mode === mode) || tabs[0];
  const comparing = selected.dataset.mode === 'compare';
  document.querySelector('main').classList.toggle('is-comparing', comparing);
  document.querySelectorAll('.comparison-source').forEach(panel => panel.classList.remove('comparison-source'));
  for (const tab of tabs) {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    panel.setAttribute('role', 'tabpanel');
    panel.removeAttribute('aria-label');
    panel.hidden = !active;
    if (active) panel.querySelectorAll('iframe[data-src]').forEach(frame => loadMount(frame));
  }
  if (comparing) showComparisonFrames();
  if (focus) selected.focus();
  if (update) {
    const url = new URL(location.href);
    url.searchParams.set('mode', selected.dataset.mode);
    history.replaceState(null, '', url);
  }
}

function selectJournal(query) {
  const journal = String(query || '').trim();
  if (!journal) return;
  hasSelection = true;
  document.getElementById('compare-empty').hidden = true;
  document.getElementById('compare-selection').hidden = false;
  document.getElementById('selected-journal').textContent = `Combined evidence for ${journal}`;
  mounts.filter(frame => compareTools.includes(frame.dataset.tool)).forEach(frame => {
    frame.src = withQuery(frame.dataset.src, journal);
  });
  const url = new URL(location.href);
  url.searchParams.set('q', journal);
  url.searchParams.set('mode', 'compare');
  history.replaceState(null, '', url);
  activate('compare', {update: false});
}

function clearSelection() {
  hasSelection = false;
  document.getElementById('compare-empty').hidden = false;
  document.getElementById('compare-selection').hidden = true;
  document.getElementById('selected-journal').textContent = '';
  const url = new URL(location.href);
  url.searchParams.delete('q');
  url.searchParams.delete('journal');
  history.replaceState(null, '', url);
  activate('compare', {update: false});
}

function focusFindSearch() {
  activate('find');
  const frame = document.querySelector('iframe[title="OA and APC Explorer"]');
  loadMount(frame);
  const focusSearch = () => {
    try { frame.contentDocument?.querySelector('input[type="search"], input')?.focus(); } catch {}
  };
  if (frame.contentDocument?.readyState === 'complete') focusSearch();
  else frame.addEventListener('load', focusSearch, {once: true});
}

function bridge(frame) {
  try {
    const doc = frame.contentDocument;
    doc.addEventListener('click', event => {
      const item = event.target.closest('[data-journal],[data-title],tr,.journal-card,.result-card');
      const query = item?.dataset.journal || item?.dataset.title || item?.querySelector?.('h2,h3,td')?.textContent;
      if (query) selectJournal(query);
    });
  } catch {}
}

for (const frame of mounts) frame.addEventListener('load', () => bridge(frame));
for (const tab of tabs) tab.addEventListener('click', () => activate(tab.dataset.mode));
document.getElementById('choose-journal').addEventListener('click', focusFindSearch);
document.getElementById('clear-selection').addEventListener('click', clearSelection);
document.querySelectorAll('[data-example-journal]').forEach(button => {
  button.addEventListener('click', () => selectJournal(button.dataset.exampleJournal));
});
document.querySelector('.tabs').addEventListener('keydown', event => {
  const index = tabs.indexOf(document.activeElement);
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : event.key === 'ArrowRight' ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
  activate(tabs[next].dataset.mode, {focus: true});
});

const params = new URLSearchParams(location.search);
const mode = params.get('mode') || 'find';
const visibleMode = ['apc', 'timing'].includes(mode) ? 'find' : mode;
activate(visibleMode, {update: false});
const initial = params.get('q') || params.get('journal');
if (initial) {
  const modeMount = {
    check: '#panel-check iframe',
    apc: 'iframe[title="OA and APC Explorer"]',
    timing: 'iframe[title="Journal Timing"]',
    match: '#panel-match iframe',
    trends: '#panel-trends iframe',
  }[mode];
  if (modeMount) {
    const frame = document.querySelector(modeMount);
    frame.src = withQuery(frame.dataset.src, initial);
  } else selectJournal(initial);
}

// data-src is the lazy-load boundary for timing, enrichment and matcher assets.
if ('IntersectionObserver' in window) new IntersectionObserver(() => {}).disconnect();
