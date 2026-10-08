import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve('style.css'), 'utf8');

function declarations(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...css.matchAll(new RegExp(`${escaped}\\{([^}]*)\\}`, 'g'))];
  assert.ok(matches.length, `missing ${selector}`);
  return Object.fromEntries(matches.flatMap(block => [...block[1].matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-f]{3,8})/gi)].map(match => [match[1], match[2]])));
}

function rgb(hex) {
  const value = hex.slice(1);
  const full = value.length === 3 ? [...value].map(char => char + char).join('') : value.slice(0, 6);
  return [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16) / 255);
}

function luminance(hex) {
  return rgb(hex).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
}

function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + .05) / (darker + .05);
}

const light = declarations(':root');
const dark = declarations(':root[data-theme=dark]');
const pairs = [['--fg', '--bg'], ['--fg', '--card'], ['--muted', '--bg'], ['--muted', '--card'], ['--accent', '--bg'], ['--accent', '--card'], ['--bg', '--accent']];

for (const [theme, tokens] of Object.entries({light, dark})) {
  test(`${theme} theme text tokens meet WCAG AA contrast`, () => {
    for (const [foreground, background] of pairs) {
      assert.ok(contrast(tokens[foreground], tokens[background]) >= 4.5, `${theme}: ${foreground} on ${background}`);
    }
  });
}
