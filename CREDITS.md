# Credits and data provenance

This file records third-party software and public metadata services used by the research tools at smbajwa.com. Names are factual attribution and do not imply affiliation or endorsement.

## qrcode-generator

- Original author: Kazuhiko Arase
- Repository: https://github.com/kazuhikoarase/qrcode-generator
- Version: 1.4.4
- Package artifact and SHA-256 checksum: recorded in `tools/_shared/vendor/qrcode-generator/1.4.4/UPSTREAM.json`
- License: MIT (`tools/_shared/vendor/qrcode-generator/1.4.4/LICENSE`)
- Used by: the shared, browser-local share dialog to draw downloadable QR codes
- Vendored material: unmodified `qrcode.js`; no remote QR service is contacted
- Retrieved: 2026-10-07

## Emerging Journals Database 2026

- Implementation and English presentation: Shoaib Munir, smbajwa.com
- Local source: the translated emerging-journal title, ISSN, discipline and quartile list in `tools/emerging-journals-2026/data.js`
- Live enrichment: OpenAlex source metadata (CC0), requested only when a visitor explicitly selects “Refresh live OpenAlex”
- External reference: journal cards link by ISSN to SCImago; no SCImago or Scopus-derived values are bundled
- Requests: identify `contact@smbajwa.com` through the documented `mailto` parameter; successful responses are cached locally for 30 days
- Excluded sources and fields: Clarivate, Scopus, CAS, Journal Impact Factor, blacklists and watchlists
- Limit: source-list quartiles are presented as supplied and are not an endorsement or quality verdict

## MiniSearch

- Original author: Luca Ongaro and contributors
- Repository: https://github.com/lucaong/minisearch
- Version/commit: 7.2.0 / `3d239d1c3ae7aef1bf5d8945dd7b5f0709f646f5`
- Package artifact: `minisearch@7.2.0` from the npm registry; integrity and SHA-256 checksums recorded in `tools/abstract-journal-matcher/third_party/minisearch/7.2.0/UPSTREAM.json`
- License: MIT (`tools/abstract-journal-matcher/third_party/minisearch/7.2.0/LICENSE.txt`)
- Used by: Abstract-to-Journal Matcher local lexical retrieval
- Vendored material: unmodified official UMD browser distribution `dist/umd/index.js`
- Retrieved: 2026-10-07

## Abstract-to-Journal Matcher data sources

- Compact journal profiles: original aggregate topic labels joined to smbajwa.com's curated journal identities; no abstracts or copied publisher scope prose
- DOAJ journal metadata: CC0, retrieved live by ISSN only after the user requests evidence
- OpenAlex source metadata: CC0, retrieved live by ISSN with `mailto=contact@smbajwa.com`
- Crossref: journal metadata retrieved live by ISSN; abstracts are not requested, stored, or exported
- Excluded sources: Clarivate, Scopus, CAS, and Journal Impact Factor values
- Cache: live evidence only, browser-local, 30-day expiry, user-clearable

## Fuse.js

- Original author: Kiro Risk and contributors
- Repository: https://github.com/krisk/Fuse
- Version/commit: 7.5.0 / `45bac9fe2e71fe8c680c861a35a8b226c4ae6d5a`
- Package artifact: `fuse.js@7.5.0` from the npm registry; package and file SHA-256 checksums recorded in `tools/journal-trust-profile/third_party/fuse/7.5.0/UPSTREAM.json`
- License: Apache-2.0 (`tools/journal-trust-profile/third_party/fuse/7.5.0/LICENSE`)
- Used by: Journal Trust Profile local typo-tolerant title/ISSN search
- Vendored material: unmodified `dist/fuse.min.mjs`
- Retrieved: 2026-10-07

The same verified, unmodified Fuse.js 7.5.0 browser artifact is also used by the OA & APC Explorer. Its complete Apache-2.0 license and checksums are repeated at `tools/oa-apc-explorer/third_party/fuse/7.5.0/` so that tool remains independently deployable.

## OA & APC Explorer data sources

- DOAJ journal metadata: CC0, retrieved live from https://doaj.org/api/ only after the user submits a search
- OpenAlex source metadata: CC0, retrieved live from https://api.openalex.org/ by exact ISSN with `mailto=contact@smbajwa.com`
- Local journal snapshot: intentionally empty; `tools/oa-apc-explorer/data/data-manifest.json` records the source and exclusion boundaries
- Cache: browser-local, 30-day expiry, user-clearable
- OpenAPC: linked as an independent historical-cost resource only; no OpenAPC ODbL/DbCL data are included, queried, cached, or merged
- Excluded sources: Clarivate, Scopus, CAS, and Journal Impact Factor data
- Used by: OA & APC Explorer

## Journal Trust Profile data sources

- DOAJ journal metadata: CC0, retrieved live from https://doaj.org/api/ after user confirmation
- OpenAlex source/work metadata: CC0, retrieved live from https://api.openalex.org/ with `mailto=contact@smbajwa.com`
- Crossref bibliographic facts: retrieved live from https://api.crossref.org/ after user confirmation; abstracts are neither requested nor stored
- Local journal search seed: derived on 2026-10-07 from `tools/emerging-journals-2026/data.js`, explicitly labeled as an smbajwa.com source
- Used by: Journal Trust Profile; cached in the browser for 30 days with a visible clear control

## Citation.js

- Original author: Lars Willighagen and contributors
- Repository: https://github.com/citation-js/citation-js
- Version/commit: 0.9.0 / `51a37ce28fd3508e5cc2957b7d17794cdbad8ed0`
- Package artifact: `citation-js@0.9.0` from the npm registry; integrity recorded in `UPSTREAM.json`
- License: MIT (`tools/_shared/vendor/citation-js/0.9.0/LICENSE.md`)
- Used by: Identifier & Citation Toolkit; Reference Integrity Checker
- Vendored material: unmodified browser bundle `build/citation.min.js`
- Local changes: upstream bundle unmodified; a separate local loader exposes its documented `require('citation-js')` module as `window.Cite`
- Retrieved: 2026-10-07

## Crossref

- Service: Crossref REST API, https://api.crossref.org/
- Documentation: https://www.crossref.org/documentation/retrieve-metadata/rest-api/
- Used by: Identifier & Citation Toolkit DOI and journal lookup; Reference Integrity Checker metadata and update lookup
- Data handling: bibliographic fields are retrieved live after user confirmation; abstracts are discarded and not exported
- Cache: browser-local, 30-day expiry, user-clearable
- Accessed: on demand; no repository snapshot

## OpenAlex

- Service and data: OpenAlex API, https://api.openalex.org/
- Data license: CC0, https://docs.openalex.org/download-all-data/openalex-snapshot
- Used by: optional Identifier & Citation Toolkit DOI/ISSN cross-check; optional Reference Integrity Checker secondary cross-check
- Requests: identify `contact@smbajwa.com` through the documented `mailto` parameter
- Cache: browser-local, 30-day expiry, user-clearable
- Accessed: on demand; no repository snapshot

## DOAJ

- Service: DOAJ API, https://doaj.org/api/v3/docs
- Journal/article metadata: CC0, https://doaj.org/terms/
- Used by: optional Identifier & Citation Toolkit ISSN lookup
- Cache: browser-local, 30-day expiry, user-clearable
- Accessed: on demand; no repository snapshot

## ORCID

- Public record site: https://orcid.org/
- Used by: local ISO 7064 checksum validation and public-record links only
- No ORCID API credentials, client secrets, source code or public-data files are included
- ORCID is a trademark of ORCID, Inc.; this site is not affiliated with or endorsed by ORCID

## Retraction Watch via Crossref

- Data source: Retraction Watch database integrated into Crossref, https://www.crossref.org/blog/retraction-watch-data-now-part-of-crossref/
- Data license: CC0
- Used by: Reference Integrity Checker update classification through Crossref `update-to` metadata
- Data handling: records are retrieved live after user confirmation; no repository snapshot is included
- Cache: browser-local IndexedDB, 30-day expiry, user-clearable
- Attribution: Retraction Watch is named as requested; no affiliation or endorsement is implied

## Plant Lab Calculator Suite formula sources

- Implementation: independently written by Shoaib Munir for smbajwa.com; no third-party runtime or calculation code
- Used by: Plant Lab Calculator Suite
- Formula references: Livak & Schmittgen (2001), Pfaffl (2001), MIQE (2009), Wallace et al. (1979), and SantaLucia (1998)
- Full citations and DOI links: `tools/plant-lab-calculators/METHODS.md`
- Primer3 boundary: no Primer3 code, parameter files, interface, or bundled executable is included
- Local changes: not applicable; the source is original to this repository
