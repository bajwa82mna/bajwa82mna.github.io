import fs from "node:fs";import crypto from "node:crypto";
const base=new URL("../",import.meta.url), profiles=JSON.parse(fs.readFileSync(new URL("data/journal-profiles.min.json",base))), manifest=JSON.parse(fs.readFileSync(new URL("data/data-manifest.json",base)));
const errors=[], ids=new Set(), issns=new Set(), pattern=/^\d{4}-\d{3}[\dX]$/;
for(const [i,p] of profiles.entries()){for(const k of ["id","title","issn","publisher","category","topics","terms"])if(p[k]==null||p[k]==="")errors.push(`${i}: missing ${k}`);if(ids.has(p.id))errors.push(`duplicate id ${p.id}`);ids.add(p.id);if(issns.has(p.issn))errors.push(`duplicate ISSN ${p.issn}`);issns.add(p.issn);if(!pattern.test(p.issn))errors.push(`invalid ISSN shape ${p.issn}`);for(const banned of ["abstract","scope","impactFactor","jif","scopus","clarivate","cas"])if(Object.hasOwn(p,banned))errors.push(`${p.id}: prohibited field ${banned}`)}
if(manifest.records!==profiles.length)errors.push(`manifest records ${manifest.records} != ${profiles.length}`);
const sha=crypto.createHash("sha256").update(fs.readFileSync(new URL("data/journal-profiles.min.json",base))).digest("hex");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}console.log(`Validated ${profiles.length} profiles; SHA-256 ${sha}`);
