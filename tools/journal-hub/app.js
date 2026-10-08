const tabs = [...document.querySelectorAll('[role="tab"]')];
const mounts = [...document.querySelectorAll('iframe[data-src]')];

function withQuery(source, query) {
  const url = new URL(source, location.href);
  if (query) url.searchParams.set('q', query);
  return `${url.pathname}${url.search}`;
}

function loadMount(frame, query = '') {
  if (!frame.src) frame.src = withQuery(frame.dataset.src, query);
}

function activate(mode, {focus = false, update = true} = {}) {
  const selected = tabs.find(tab => tab.dataset.mode === mode) || tabs[0];
  for (const tab of tabs) {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    panel.hidden = !active;
    if (active) panel.querySelectorAll('iframe[data-src]').forEach(frame => loadMount(frame));
  }
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
  document.getElementById('profile-status').textContent = `Combined evidence for ${journal}`;
  document.querySelectorAll('.profile-mount').forEach(frame => {
    frame.src = withQuery(frame.dataset.src, journal);
  });
  const url = new URL(location.href);
  url.searchParams.set('q', journal);
  url.searchParams.set('mode', 'compare');
  history.replaceState(null, '', url);
  activate('compare', {update: false});
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
