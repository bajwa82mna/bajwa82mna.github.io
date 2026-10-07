import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pages=['index.html','privacy.html','tools/index.html',...fs.readdirSync(path.join(root,'tools'),{withFileTypes:true}).filter(x=>x.isDirectory()&&!x.name.startsWith('_')).map(x=>`tools/${x.name}/index.html`).filter(x=>fs.existsSync(path.join(root,x)))];

test('every HTML page has resolvable local scripts and styles',()=>{
  for(const page of pages){const html=fs.readFileSync(path.join(root,page),'utf8');for(const [,attr,url] of html.matchAll(/<(script|link)\b[^>]*\b(src|href)=["']([^"']+)["']/gi)){if(!/\.(?:js|css)(?:\?|$)/.test(url)||/^(?:https?:|data:)/.test(url))continue;const clean=url.split('?')[0],target=clean.startsWith('/')?path.join(root,clean):path.resolve(path.dirname(path.join(root,page)),clean);assert.ok(fs.existsSync(target),`${page}: missing ${url}`)}}
});

test('every inline classic script parses',()=>{
  for(const page of pages){const html=fs.readFileSync(path.join(root,page),'utf8');for(const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)){if(/type=["']module["']/i.test(match[0]))continue;assert.doesNotThrow(()=>new vm.Script(match[1],{filename:page}),page)}}
});

test('external links use safe new-tab attributes',()=>{
  for(const page of pages){const html=fs.readFileSync(path.join(root,page),'utf8');for(const [anchor] of html.matchAll(/<a\b[^>]*href=["']https?:\/\/[^"']+["'][^>]*>/gi)){assert.match(anchor,/target=["']_blank["']/i,`${page}: ${anchor}`);assert.match(anchor,/rel=["'][^"']*noopener[^"']*noreferrer[^"']*["']/i,`${page}: ${anchor}`)}}
});

test('tool directory links every shipped tool and site credits',()=>{
  const html=fs.readFileSync(path.join(root,'tools/index.html'),'utf8');
  for(const name of ['emerging-journals-2026','reference-checker','identifier-toolkit','journal-trust-profile','oa-apc-explorer','plant-lab-calculators','abstract-journal-matcher'])assert.match(html,new RegExp(`href=["']${name}/`));
  assert.match(html,/href=["']\/CREDITS\.md["']/);
});

test('deployed HTML and app code contain no tracking, API keys, or prohibited commercial data integrations',()=>{
  const files=[...pages,...walk(path.join(root,'tools')).filter(x=>/\.(?:js|html)$/.test(x)&&!x.includes('/build/')&&!x.includes('/third_party/')&&!x.includes('/vendor/')).map(x=>path.relative(root,x))];
  const text=files.map(x=>fs.readFileSync(path.join(root,x),'utf8')).join('\n');
  assert.doesNotMatch(text,/googletagmanager|google-analytics|segment\.com|mixpanel|api[_-]?key\s*[:=]/i);
  assert.doesNotMatch(text,/api\.(?:clarivate|scopus)\.com|api\.elsevier\.com/i);
});

test('privacy policy documents local processing, optional lookups, caches, and providers',()=>{
  const text=fs.readFileSync(path.join(root,'privacy.html'),'utf8');
  for(const expected of ['2026-10-07','contact@smbajwa.com','localStorage','IndexedDB','30 days','Crossref','OpenAlex','DOAJ','Manuscripts and abstract text never leave your browser'])assert.match(text,new RegExp(expected,'i'));
  assert.match(text,/Cloudflare[\s\S]*if enabled/i);
  assert.match(text,/after[\s\S]*confirmation/i);
  assert.doesNotMatch(text,/social media scheduling|LinkedIn and X account/i);
});

function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)])}
