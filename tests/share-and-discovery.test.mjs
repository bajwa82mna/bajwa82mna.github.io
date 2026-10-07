import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {buildShareUrls, normalizeShareData} from '../tools/_shared/js/share.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pages=['index.html','tools/index.html',...fs.readdirSync(path.join(root,'tools'),{withFileTypes:true}).filter(x=>x.isDirectory()&&!x.name.startsWith('_')&&fs.existsSync(path.join(root,'tools',x.name,'index.html'))).map(x=>`tools/${x.name}/index.html`)];

test('share data accepts only canonical smbajwa.com HTTPS URLs',()=>{
  const copy={title:'Open research tools',text:'Seven free, open tools for students and researchers — smbajwa.com'};
  assert.equal(normalizeShareData({url:'https://smbajwa.com/tools/',...copy}).url,'https://smbajwa.com/tools/');
  for(const url of ['http://smbajwa.com/tools/','https://evil.example/','https://smbajwa.com.evil.example/','https://smbajwa.com:444/tools/','https://user@smbajwa.com/tools/','javascript:alert(1)','/tools/'])assert.throws(()=>normalizeShareData({url,...copy}),/smbajwa\.com HTTPS/);
});

test('share intent builders encode fixed text and URL without leaking payloads',()=>{
  const safe={url:'https://smbajwa.com/tools/reference-checker/',title:'Reference Integrity Checker',text:'Free, open tool for students and researchers: Reference Integrity Checker — smbajwa.com'};
  const urls=buildShareUrls(safe);
  for(const [network,url] of Object.entries(urls)){
    assert.match(url,/^(?:https:|mailto:)/,network);
    assert.ok(url.includes(encodeURIComponent(safe.url))||decodeURIComponent(url).includes(safe.url),`${network}: URL`);
  }
  for(const payload of ['secret manuscript title','10.5555/private-id','<script>alert(1)</script>','a&b=c#d','研究内容']){
    for(const field of ['url','title','text']){
      const candidate={...safe,[field]:payload};
      if(field==='url')assert.throws(()=>buildShareUrls(candidate));
      else assert.throws(()=>buildShareUrls(candidate),/approved share copy/);
    }
  }
});

test('share URLs strip query and hash except a validated journal dataset link',()=>{
  assert.equal(normalizeShareData({url:'https://smbajwa.com/tools/?utm_source=x#private',title:'Open research tools',text:'Seven free, open tools for students and researchers — smbajwa.com'}).url,'https://smbajwa.com/tools/');
  const journal={title:'Plant Journal',issns:['1234-567X']};
  const good=normalizeShareData({url:'https://smbajwa.com/tools/emerging-journals-2026/?q=Plant+Journal#x',title:'Plant Journal — Emerging Journals 2026',text:'Journal record: Plant Journal — Emerging Journals Database 2026, smbajwa.com',journal});
  assert.equal(good.url,'https://smbajwa.com/tools/emerging-journals-2026/?q=Plant+Journal');
  assert.throws(()=>normalizeShareData({...good,url:'https://smbajwa.com/tools/emerging-journals-2026/?q=Typed+secret',journal}),/dataset journal/);
});

test('all public share pages expose accessible share controls and shared assets',()=>{
  for(const page of pages){
    const html=fs.readFileSync(path.join(root,page),'utf8');
    assert.match(html,/data-share\b/,`${page}: button`);
    assert.match(html,/tools\/_shared\/css\/share\.css\?v=8/,`${page}: CSS cache bust`);
    assert.match(html,/tools\/_shared\/js\/share\.js\?v=\d+/,`${page}: JS cache bust`);
  }
});

test('share component contains dialog semantics, keyboard handling, and a live region',()=>{
  const js=fs.readFileSync(path.join(root,'tools/_shared/js/share.js'),'utf8');
  for(const token of ["setAttribute\\('role','dialog'\\)",'aria-modal','aria-live="polite"','Escape','Tab','navigator.share','clipboard'])assert.match(js,new RegExp(token));
});

test('OG, Twitter, canonical metadata use absolute local assets on every share page',()=>{
  for(const page of pages){
    const html=fs.readFileSync(path.join(root,page),'utf8');
    for(const property of ['og:title','og:description','og:url','og:image'])assert.match(html,new RegExp(`<meta property=["']${property}["'] content=["'][^"']+`),`${page}: ${property}`);
    for(const property of ['og:url','og:image'])assert.match(html,new RegExp(`<meta property=["']${property}["'] content=["']https://`),`${page}: absolute ${property}`);
    assert.match(html,/<meta name="twitter:card" content="summary_large_image">/,`${page}: twitter card`);
    assert.match(html,/<link rel="canonical" href="https:\/\/smbajwa\.com\//,`${page}: canonical`);
    const image=html.match(/<meta property="og:image" content="https:\/\/smbajwa\.com(\/assets\/og\/[^"?]+\.png)\?v=8">/)?.[1];
    assert.ok(image,`${page}: cache-busted local OG image`);
    const file=path.join(root,image); assert.ok(fs.existsSync(file),`${page}: ${image}`); assert.ok(fs.statSync(file).size<150_000,`${image}: under 150KB`);
    const png=fs.readFileSync(file);assert.equal(png.readUInt32BE(16),1200,`${image}: width`);assert.equal(png.readUInt32BE(20),630,`${image}: height`);
  }
});

test('sitemap lists canonical pages backed by real files',()=>{
  const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  for(const page of [...pages,'privacy.html']){
    const url=page==='index.html'?'https://smbajwa.com/':`https://smbajwa.com/${page.replace(/index\.html$/,'')}`;
    assert.match(xml,new RegExp(`<loc>${url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}</loc>`),url);
    const html=fs.readFileSync(path.join(root,page),'utf8'),canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.equal(canonical,url,`${page}: canonical matches sitemap`);
  }
});

test('vendored QR generator has provenance, license, checksum, and deterministic output',async()=>{
  const dir=path.join(root,'tools/_shared/vendor/qrcode-generator/1.4.4');
  for(const file of ['qrcode.js','LICENSE','UPSTREAM.json'])assert.ok(fs.existsSync(path.join(dir,file)),file);
  const upstream=JSON.parse(fs.readFileSync(path.join(dir,'UPSTREAM.json'),'utf8'));
  assert.match(upstream.sha256,/^[a-f0-9]{64}$/);
  const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'qrcode.js'))).digest('hex');
  assert.equal(actual,upstream.sha256);
  const {createRequire}=await import('node:module');
  globalThis.qrcode=createRequire(import.meta.url)(path.join(dir,'qrcode.js'));
  const {createQrMatrix}=await import('../tools/_shared/js/share.js');
  assert.deepEqual(createQrMatrix('https://smbajwa.com/tools/'),createQrMatrix('https://smbajwa.com/tools/'));
});

test('every indexable page has complete discovery metadata and valid JSON-LD',()=>{
  const all=[...pages,'privacy.html'];
  const titles=new Set;
  for(const page of all){
    const html=fs.readFileSync(path.join(root,page),'utf8');
    const title=html.match(/<title>([^<]+)<\/title>/)?.[1];assert.ok(title,`${page}: title`);assert.ok(!titles.has(title),`${page}: unique title`);titles.add(title);
    for(const token of ['name="description"','name="robots" content="index,follow,max-image-preview:large"','property="og:type"','property="og:site_name"','property="og:locale"','property="og:title"','property="og:description"','property="og:url"','property="og:image"','property="og:image:width" content="1200"','property="og:image:height" content="630"','property="og:image:alt"','name="twitter:card" content="summary_large_image"','name="twitter:title"','name="twitter:description"','name="twitter:image"','name="twitter:image:alt"','name="theme-color"','name="author"','hreflang="en"','name="applicable-device"','name="mobile-agent"','name="format-detection"','itemprop="name"','itemprop="description"','itemprop="image"','rel="manifest"','rel="apple-touch-icon"'])assert.ok(html.includes(token),`${page}: ${token}`);
    const blocks=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];assert.ok(blocks.length,`${page}: JSON-LD`);for(const block of blocks)assert.doesNotThrow(()=>JSON.parse(block[1]),`${page}: JSON-LD parses`);
  }
});

test('shared WeChat, logo icons, manifest, sitemap, and 404 assets are complete',()=>{
  for(const [file,minW,minH,max] of [['assets/og/wechat-thumb.png',512,512,100_000],['assets/logo/favicon-32.png',32,32,30_000],['assets/logo/favicon-180.png',180,180,100_000],['assets/logo/favicon-192.png',192,192,100_000],['assets/logo/favicon-512.png',512,512,150_000]]){const png=fs.readFileSync(path.join(root,file));assert.equal(png.toString('ascii',1,4),'PNG',file);assert.equal(png.readUInt32BE(16),minW,file);assert.equal(png.readUInt32BE(20),minH,file);assert.ok(png.length<max,file)}
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'site.webmanifest'),'utf8'));
  assert.deepEqual(manifest.icons.map(icon=>icon.sizes),['192x192','512x512']);
  for(const icon of manifest.icons)assert.ok(fs.existsSync(path.join(root,icon.src.split('?')[0])),icon.src);
  const notFound=fs.readFileSync(path.join(root,'404.html'),'utf8');assert.match(notFound,/noindex/);assert.match(notFound,/href="\/tools\/"/);
  const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');assert.match(xml,/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);assert.match(xml,/<image:image>/);assert.doesNotMatch(xml,/404/);
});

test('every HTML page references the versioned logo icon set',()=>{
  const allPages=['404.html','privacy.html',...pages];
  for(const page of allPages){
    const html=fs.readFileSync(path.join(root,page),'utf8');
    assert.match(html,/<link rel="manifest" href="\/site\.webmanifest\?v=8">/,`${page}: manifest`);
    assert.match(html,/<link rel="apple-touch-icon" href="\/assets\/logo\/favicon-180\.png\?v=8">/,`${page}: apple icon`);
    assert.match(html,/<link rel="icon" href="\/assets\/logo\/favicon-32\.png\?v=8" sizes="32x32" type="image\/png">/,`${page}: favicon`);
  }
});

test('theme control is shared, sticky, stateful, and no floating control remains',()=>{
  const js=fs.readFileSync(path.join(root,'theme.js'),'utf8'),css=fs.readFileSync(path.join(root,'style.css'),'utf8');
  for(const token of ['localStorage','try','prefers-color-scheme','aria-pressed','theme-state','site-bar'])assert.match(js,new RegExp(token));
  assert.match(css,/\.site-bar\{[^}]*position:sticky/);assert.doesNotMatch(css,/\.theme-switch\{[^}]*position:fixed/);
  for(const asset of ['logo-horizontal.svg','logo-dark.svg']){assert.ok(fs.existsSync(path.join(root,'assets/logo',asset)),asset);assert.match(js,new RegExp(asset.replace('.','\\.')))}
  for(const page of [...pages,'privacy.html']){const html=fs.readFileSync(path.join(root,page),'utf8');assert.match(html,/theme\.js\?v=\d+/);assert.match(html,/style\.css\?v=\d+/)}
});

test('journal cards use the shared dialog with deep-link citation and summary actions',()=>{
  const js=fs.readFileSync(path.join(root,'tools/emerging-journals-2026/app.js'),'utf8');
  for(const token of ['openShare','https://smbajwa.com/tools/emerging-journals-2026/','searchParams.set(\'q\'','citation','summary','OpenAlex citation score','Copy summary'])assert.match(js,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace('Copy summary','summary')));
});

test('journal deep-link share data survives normalize then buildShareUrls', async () => {
  const { normalizeShareData, buildShareUrls } = await import('../tools/_shared/js/share.js');
  const title = 'Nature Reviews Disease Primers';
  const url = new URL('https://smbajwa.com/tools/emerging-journals-2026/'); url.searchParams.set('q', title);
  const input = { url: url.href, title: title + ' — Emerging Journals 2026', text: 'Journal record: ' + title + ' — Emerging Journals Database 2026, smbajwa.com', journal: { title, issns: ['2056-676X'] } };
  const normalized = normalizeShareData(input);
  assert.ok(buildShareUrls(normalized).X.includes('x.com/intent'));
});
