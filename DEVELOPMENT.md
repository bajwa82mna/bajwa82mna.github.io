# Development notes

Technical notes for maintaining smbajwa.com. No credentials or personal contact details belong in this file or anywhere in this public repo.

## Architecture
- Static site on GitHub Pages (`main` branch, `.nojekyll`, custom domain in `CNAME`) behind Cloudflare. No backend; every tool runs in the browser.
- Every page carries a strict CSP meta tag: `script-src 'self'`, `img-src 'self' data:`, `connect-src` limited to `'self'` and approved APIs (OpenAlex, DOAJ, Crossref where a tool needs them; Journal Timing sends only an ISSN to api.crossref.org, and only after the user clicks the opt-in lookup button). In-page `fetch` to the site itself is blocked, so use `curl` for server checks.
- The five public tools are Journal Hub, Publishing Toolkit, Plant Lab Toolkit, Descriptive Statistics, and Journal Figure Resizer. Retired tool directories retain data, audited modules, tests, and redirect stubs; shared code lives in `tools/_shared/`.
- Each tool has `examples/` (CSV/TXT, plus BibTeX/RIS for the reference checker). `?example=1` auto-loads the example. Uploads are read client-side with FileReader (2 MB cap, per-tool row limits counted as CSV records); files are never sent anywhere.
- `tools/_shared/css/tool-shell.css` is the single shared stylesheet for every tool page (hero, breadcrumb, chips, share row, tab bar, forms, tables, FAQ, `--ui-font`). Tests in `tests/tool-shell-consistency.test.mjs` and `tests/contrast.test.mjs` guard it. Panels toggled with `hidden` need an explicit `[hidden]{display:none}` when the panel class sets `display`.
- Hubs (Journal Hub, Publishing Toolkit) embed legacy tools in lazy `?embed=1` iframes; `_shared/js/embed.js` syncs height by postMessage (cap 4800px). Legacy URLs redirect to the hubs. Plant Lab Toolkit and Variant Toolkit are native pages (no iframes).
- Landing page: `tools/index.html`, `tools/landing.js`, catalogue in `tools/_shared/js/catalogue.js` (`?q=`, `?cat=`, pins in localStorage).
- Journal Timing is sharded: `tools/journal-timing/data/` has `manifest.json`, 256 SHA-1 shards, 445 title-prefix indexes and coverage files (initial transfer about 128 KB); `src/summary.js` ports the Python summary, with golden tests. Build with `build/build.py` (resumable; a Crossref 404 means no data; cache gitignored).
- Shared top bar (Auto/Light/Dark control and theme-aware logo) is built by `theme.js` and styled in `style.css`.
- Logo sources and rules: `assets/logo/README.md`. Share-preview images are regenerated with `assets/og/generate.py`.

## Sharing rules (`tools/_shared/js/share.js`)
Only allow-listed canonical `https://smbajwa.com` URLs and fixed approved titles/text are shared. Query and hash are stripped, except a validated journal deep link `?q=<title>` that must match a dataset journal. User-entered text is never shared. WeChat uses a locally generated QR code.

## Cache and deploy procedure
1. Bump the `?v=N` on every changed asset reference (css, js, logo, icons, manifest). The version is unified across the site (currently v25) and enforced by `tests/module-cache-version.test.mjs` (`const release`). Use a sed pattern without `\b` on macOS. Every relative ESM import in a tool's `app.js` and nested `src/*.js` must also carry the same `?v=N` used by that tool; never leave a module-graph edge unversioned.
2. Commit and push to `main`.
3. Wait until the Pages build for that commit is finished before requesting any new `?v=` URL, otherwise Cloudflare caches the stale file under the new version (a manual fetch of the new URL before the build finishes does this too, as happened with v23):
   `gh api repos/bajwa82mna/bajwa82mna.github.io/pages/builds/latest --jq '.status, .commit'` (status `built`, commit equal to `git rev-parse HEAD`).
4. Check the live page with `curl`, then in a browser. Cloudflare caches assets about 4 hours (including 404s); "Purge Everything" in the dashboard clears it.

## Tests
- `node --test` from the repo root (privacy, share, metadata, JSON-LD, sitemap, theme bar, icons, examples, core functions, and consolidation contracts).
- `python3 -m unittest discover -s tools/emerging-journals-2026/build -p 'test_*.py'`.
- `python3 -m unittest discover -s tools/journal-timing/build -p 'test_*.py'`.
Run both before every push.

## Data and licensing
OpenAlex (CC0), DOAJ and Crossref are used. SJR/SCImago data is not bundled (outbound link only). No Clarivate, Scopus, CAS or JIF data. See `CREDITS.md` and `NOTICE`.

User-facing credits, data provenance, licences, and scope notes live only on `/credits/`; tool pages link there instead of repeating them.

## Known gaps
- Not tested on real social platforms, a phone share sheet, Safari/Firefox, a screen reader or a WeChat preview.
- About 540 journals are unmatched (wrong source ISSNs); a name-based lookup could fix some.
- Urdu translation is partial. In Plant Lab Toolkit, only primer Tm is labelled Experimental pending the review documented in `METHODS.md`.
- Search-engine verification tags are not added yet (see README for how).
