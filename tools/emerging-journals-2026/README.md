# Emerging Journals Database 2026

## Sharing

The shared privacy-first dialog offers page and journal-record deep links. Journal shares may include the public journal name, ISSN, quartile, category, OpenAlex citation score, h-index, and `?q=` link; no private input is included. Citation-style references and summaries can be copied, and QR codes are generated locally.

This static browser tool combines the rank-aligned journal list in `data.js` with bulk, openly licensed enrichment data. `data-extra.js` supplies card metrics and filters; 24 balanced files under `trends/` are lazy-loaded by journal row index only when details are opened. The live OpenAlex refresh is an optional freshness check and is not a replacement for the bulk dataset.

## Rebuild the enrichment

Run from the repository root:

```sh
python3 tools/emerging-journals-2026/build/enrich.py
```

The standard-library-only builder reads `data.js`, batches up to 50 ISSNs per OpenAlex request, and identifies requests with `mailto=contact@smbajwa.com`. Responses are cached in `build/cache/`. Set `OPENALEX_API_KEY` in the environment only when required; the key must never be written to disk.

OpenAlex ISSN candidates must pass the normalized journal-name agreement guard. Names are accent-folded, `&` is treated as `and`, common stopwords are removed, and remaining names must be substrings or reach a `difflib` ratio of at least 0.85. Cache filenames use the `v2|` key prefix so pre-guard responses cannot silently determine matches. Warning-list ingestion remains disabled because its redistribution licence is unclear.

Outputs are `data-extra.js`, `trends/trends-0.js` through `trends/trends-23.js`, and `build/report.json`. Rows in `data-extra.js` must remain aligned with `RAW.rows`; unmatched rows are represented by `null`. OpenAlex trends cover 2016–2025 and remain separate lazy-loaded assets of at most about 400 KB each. SJR values are not bundled; journal cards link to SCImago by ISSN so visitors can view SJR at its source.

## Regression protection

Run:

```sh
python3 -m unittest tools/emerging-journals-2026/build/test_enrich.py
node --test tools/emerging-journals-2026/build/test_ui.mjs
node --check tools/emerging-journals-2026/metrics.js
```

**Do not delete `data-extra.js`, `metrics.js`, `enhancements.css`, the build scripts, or the report.** If enrichment is temporarily incomplete, preserve these assets and let the UI fall back gracefully; do not replace bulk metrics with live-click-only lookup.
