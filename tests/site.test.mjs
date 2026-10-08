import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pages=['index.html','privacy.html','credits/index.html','tools/index.html',...fs.readdirSync(path.join(root,'tools'),{withFileTypes:true}).filter(x=>x.isDirectory()&&!x.name.startsWith('_')).map(x=>`tools/${x.name}/index.html`).filter(x=>fs.existsSync(path.join(root,x)))];

test('every HTML page has resolvable local scripts and styles',()=>{
  for(const page of pages){const html=fs.readFileSync(path.join(root,page),'utf8');for(const [,attr,url] of html.matchAll(/<(script|link)\b[^>]*\b(src|href)=["']([^"']+)["']/gi)){if(!/\.(?:js|css)(?:\?|$)/.test(url)||/^(?:https?:|data:)/.test(url))continue;const clean=url.split('?')[0],target=clean.startsWith('/')?path.join(root,clean):path.resolve(path.dirname(path.join(root,page)),clean);assert.ok(fs.existsSync(target),`${page}: missing ${url}`)}}
});

test('every inline classic script parses',()=>{
  for(const page of pages){const html=fs.readFileSync(path.join(root,page),'utf8');for(const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)){if(/type=["'](?:module|application\/ld\+json)["']/i.test(match[0]))continue;assert.doesNotThrow(()=>new vm.Script(match[1],{filename:page}),page)}}
});

test('external links use safe new-tab attributes',()=>{
  for(const page of pages){const html=fs.readFileSync(path.join(root,page),'utf8');for(const [anchor] of html.matchAll(/<a\b[^>]*href=["']https?:\/\/[^"']+["'][^>]*>/gi)){assert.match(anchor,/target=["']_blank["']/i,`${page}: ${anchor}`);assert.match(anchor,/rel=["'][^"']*noopener[^"']*noreferrer[^"']*["']/i,`${page}: ${anchor}`)}}
});

test('tool directory links every shipped tool and the credits page',()=>{
  const html=fs.readFileSync(path.join(root,'tools/index.html'),'utf8');
  for(const name of ['emerging-journals-2026','reference-checker','identifier-toolkit','journal-trust-profile','oa-apc-explorer','plant-lab-calculators','abstract-journal-matcher','dilution-calculator','qpcr-ddct-calculator','reverse-complement','descriptive-statistics','journal-figure-resizer'])assert.match(html,new RegExp(`href=["']${name}/`));
  assert.match(html,/href=["']\/credits\/["']/);
});

test('tool pages link to consolidated credits without attribution or licence blocks',()=>{
  const toolPages=pages.filter(page=>/^tools\/[^/]+\/index\.html$/.test(page));
  for(const page of toolPages){
    const html=fs.readFileSync(path.join(root,page),'utf8');
    assert.match(html,/href=["']\/credits\/["'][^>]*>Credits and data sources<\/a>/,`${page}: credits link`);
    assert.doesNotMatch(html,/Built on|Credits, scope and limits|Methods, scope and credits|Data sources and credits|Sources, scope and privacy/i,`${page}: consolidated block`);
    assert.doesNotMatch(html,/Methods and privacy[\s\S]{0,80}Tool notice[\s\S]{0,80}Site credits/i,`${page}: legacy links`);
  }
});

test('credits page preserves required attribution, licences, and scope notes',()=>{
  const html=fs.readFileSync(path.join(root,'credits/index.html'),'utf8');
  for(const expected of ['OpenAlex','DOAJ','Crossref','Retraction Watch','ORCID','SCImago','Citation.js 0.9.0','Lars Willighagen','Fuse.js 7.5.0','Kiro Risk','MiniSearch 7.2.0','Luca Ongaro','qrcode-generator 1.4.4','Kazuhiko Arase','Apache-2.0','MIT','not a Journal Impact Factor','not an endorsement','Fees and waivers are publisher declarations','CREDITS.md','NOTICE'])assert.match(html,new RegExp(expected,'i'),expected);
});

test('deployed HTML and app code contain no tracking, API keys, or prohibited commercial data integrations',()=>{
  const files=[...pages,...walk(path.join(root,'tools')).filter(x=>/\.(?:js|html)$/.test(x)&&!x.includes('/build/')&&!x.includes('/third_party/')&&!x.includes('/vendor/')).map(x=>path.relative(root,x))];
  const text=files.map(x=>fs.readFileSync(path.join(root,x),'utf8')).join('\n');
  assert.doesNotMatch(text,/googletagmanager|google-analytics|segment\.com|mixpanel|api[_-]?key\s*[:=]/i);
  assert.doesNotMatch(text,/api\.(?:clarivate|scopus)\.com|api\.elsevier\.com/i);
});

test('privacy policy documents local processing, optional lookups, caches, and providers',()=>{
  const text=fs.readFileSync(path.join(root,'privacy.html'),'utf8');
  for(const expected of ['2026-10-07','Contact \\(at\\) smbajwa.com','localStorage','IndexedDB','30 days','Crossref','OpenAlex','DOAJ','Manuscripts and abstract text never leave your browser'])assert.match(text,new RegExp(expected,'i'));
  assert.match(text,/Cloudflare[\s\S]*if enabled/i);
  assert.match(text,/after[\s\S]*confirmation/i);
  assert.doesNotMatch(text,/social media scheduling|LinkedIn and X account/i);
});

function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)])}

import { readFileSync as _rf } from 'node:fs';
import { test as _t } from 'node:test';
import _assert from 'node:assert/strict';
_t('Emerging Journals live OpenAlex lookup sends a hyphenated ISSN', () => {
  const src = _rf(new URL('../tools/emerging-journals-2026/app.js', import.meta.url), 'utf8');
  const target = _rf(new URL('../tools/emerging-journals-2026/src/openalex.js', import.meta.url), 'utf8');
  _assert.match(src, /openAlexSourceTarget/);
  _assert.match(target, /compact\.slice\(0, 4\).*compact\.slice\(4\)/);
});
