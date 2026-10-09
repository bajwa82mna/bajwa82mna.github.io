import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve('.');
const embedSource = () => fs.readFileSync(path.join(root, 'tools/_shared/js/embed.js'), 'utf8');

function loadEmbed(search = '') {
  const classes = new Set();
  const listeners = new Map();
  const parent = {postMessage() {}};
  const context = {
    URLSearchParams,
    location: {search, origin: 'https://example.test'},
    parent,
    document: {
      documentElement: {classList: {add: value => classes.add(value)}},
      addEventListener(type, handler) { listeners.set(type, handler); },
      querySelectorAll() { return []; },
      body: null,
    },
    addEventListener(type, handler) { listeners.set(type, handler); },
    ResizeObserver: class { observe() {} },
    requestAnimationFrame(callback) { callback(); },
    getComputedStyle() { return {height: '0px'}; },
    console,
  };
  context.window = context;
  vm.runInNewContext(embedSource(), context, {filename: 'embed.js'});
  return {api: context.EmbedBridge, classes, parent, listeners};
}

test('embed flag applies is-embedded only for embed=1', () => {
  assert.equal(loadEmbed('?embed=1').classes.has('is-embedded'), true);
  assert.equal(loadEmbed('?embed=0').classes.has('is-embedded'), false);
  assert.equal(loadEmbed('?q=x').classes.has('is-embedded'), false);
});

test('parent messages require the same origin and exact parent window', () => {
  const {api, parent} = loadEmbed('?embed=1');
  assert.equal(api.isTrustedParentMessage({origin: 'https://example.test', source: parent}), true);
  assert.equal(api.isTrustedParentMessage({origin: 'https://evil.test', source: parent}), false);
  assert.equal(api.isTrustedParentMessage({origin: 'https://example.test', source: {}}), false);
});

test('frame messages require the same origin and a mounted frame source', () => {
  const {api} = loadEmbed();
  const source = {};
  const frame = {contentWindow: source};
  assert.equal(api.frameForMessage({origin: 'https://example.test', source}, [frame]), frame);
  assert.equal(api.frameForMessage({origin: 'https://evil.test', source}, [frame]), null);
  assert.equal(api.frameForMessage({origin: 'https://example.test', source: {}}, [frame]), null);
});

test('mounted iframe heights are capped at 4800px and oversized content scrolls internally', () => {
  const {api, listeners} = loadEmbed();
  const source = {};
  const attributes = new Map();
  const frame = {
    contentWindow: source,
    style: {},
    setAttribute(name, value) { attributes.set(name, value); },
    addEventListener() {},
  };
  api.mountFrames([frame]);
  listeners.get('message')({
    origin: 'https://example.test',
    source,
    data: {type: api.HEIGHT_MESSAGE, height: 528022},
  });
  assert.equal(api.MAX_FRAME_HEIGHT, 4800);
  assert.equal(frame.style.height, '4800px');
  assert.equal(attributes.get('scrolling'), 'yes');
});

test('Journal Hub declares each embedded tool source once', () => {
  const html = fs.readFileSync(path.join(root, 'tools/journal-hub/index.html'), 'utf8');
  const sources = [...html.matchAll(/data-src=["']([^"']+)["']/g)].map(match => match[1]);
  assert.equal(sources.length > 0, true);
  assert.deepEqual(sources, [...new Set(sources)]);
});

test('every iframe target and Plant Lab load the versioned shared embed assets', () => {
  const hostFiles = ['tools/journal-hub/index.html', 'tools/publishing-toolkit/index.html'];
  const targets = new Set(['tools/plant-lab-calculators/index.html']);
  for (const hostFile of hostFiles) {
    const html = fs.readFileSync(path.join(root, hostFile), 'utf8');
    for (const match of html.matchAll(/data-src=["']([^?"']+)/g)) {
      targets.add(path.join(path.dirname(hostFile), match[1], 'index.html'));
    }
  }
  for (const file of targets) {
    const html = fs.readFileSync(path.resolve(root, file), 'utf8');
    assert.match(html, /\/tools\/_shared\/css\/embed\.css\?v=22/, file);
    assert.match(html, /\/tools\/_shared\/js\/embed\.js\?v=22/, file);
  }
});
