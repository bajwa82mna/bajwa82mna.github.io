import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const root=new URL("../../",import.meta.url),app=fs.readFileSync(new URL("app.js",root),"utf8"),api=fs.readFileSync(new URL("src/api.js",root),"utf8"),html=fs.readFileSync(new URL("index.html",root),"utf8");
test("manuscript inputs are not passed to live API module",()=>{assert(!api.includes("abstract"));assert(!api.includes("keywords"));assert.match(api,/issn/);assert.match(api,/mailto=\$\{MAIL\}/)});
test("no tracking, secrets, or unsafe external-link pattern",()=>{const all=app+api+html;assert.doesNotMatch(all,/google-analytics|gtag\(|segment\.io|mixpanel|api[_-]?key|bearer\s/i);assert.match(html,/rel="noopener noreferrer"/)});
