# OA & APC Explorer

A static, browser-only research tool by Shoaib Munir / smbajwa.com for comparing open-access fee declarations, waiver information, licences, and publication context. It is not a fee quote, journal ranking, endorsement, or submission recommendation.

## Sources and refresh behavior

- DOAJ journal metadata (CC0) is requested live after the user submits a search. The tool uses OA/APC declarations, currencies, waivers, licences, copyright fields, subjects, publisher, title, and ISSNs.
- OpenAlex source metadata (CC0) is requested live by validated ISSN, with `mailto=contact@smbajwa.com`, to add contextual work/OA counts.
- Responses are cached in `localStorage` for 30 days and can be cleared in the interface.
- The repository snapshot contains zero journal records. `data/data-manifest.json` documents this deliberate choice.
- OpenAPC data are not used, copied, merged, or cached. The interface only links to OpenAPC as a separate historical-cost resource.
- Clarivate, Scopus, CAS, and Journal Impact Factor data are not used.

## Interpretation and privacy

“Declares no APC,” “amount declared,” and “unknown/not reported” are separate states. Missing values are never treated as zero. DOAJ amounts are declarations, not guaranteed current prices. OpenAlex counts provide publication context, not quality scores.

Only a submitted journal query and matching ISSNs leave the browser. Filtering, fuzzy search, comparisons, manual-rate currency calculations, budget scenarios, and CSV/JSON exports are local. No analytics or tracking scripts are included. External links open in a new tab with `noopener noreferrer`.

## Tests

Run from the repository root:

```sh
node --test tools/oa-apc-explorer/tests/unit/*.test.mjs tools/oa-apc-explorer/tests/integration/*.test.mjs tools/oa-apc-explorer/tests/e2e/*.test.mjs
node --check tools/oa-apc-explorer/app.js
```

## Dependency

Fuse.js 7.5.0, Apache-2.0, by Kiro Risk and contributors. The unmodified npm distribution, full licence, pinned commit, source URL, and SHA-256 checksums are in `third_party/fuse/7.5.0/`.
