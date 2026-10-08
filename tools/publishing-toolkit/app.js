const tabs = [...document.querySelectorAll('[role="tab"]')];

function setMode(mode, focus = false) {
  const selected = tabs.find(tab => tab.dataset.mode === mode) || tabs[0];
  for (const tab of tabs) {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    panel.hidden = !active;
    const frame = panel.querySelector('iframe[data-src]');
    if (active && !frame.src) frame.src = frame.dataset.src;
  }
  if (focus) selected.focus();
  const url = new URL(location.href);
  url.searchParams.set('mode', selected.dataset.mode);
  history.replaceState(null, '', url);
}

tabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
document.querySelector('.tabs').addEventListener('keydown', event => {
  const index = tabs.indexOf(document.activeElement);
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : event.key === 'ArrowRight' ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
  setMode(tabs[next].dataset.mode, true);
});

setMode(new URLSearchParams(location.search).get('mode') === 'identifiers' ? 'identifiers' : 'references');
