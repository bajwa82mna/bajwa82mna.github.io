# Reference Integrity Checker

## Sharing

The shared privacy-first dialog shares only this tool's public URL and fixed descriptive text. Pasted references, DOI lists, identifiers, checks, and results are never placed in share URLs. QR codes are generated locally.

Experimental, local-first reference audit by Shoaib Munir for smbajwa.com. It accepts DOI lists, BibTeX, RIS, CSL-JSON, formatted references, and local text files. Local parsing, DOI normalization, duplicate detection, plant-science review hints, report rendering, and exports stay in the browser.

## Online evidence and privacy

Online checking runs only after confirmation. It sends a normalized DOI, or citation title/first-author search fields when no DOI is available, to Crossref. OpenAlex is an optional second source and requests identify `contact@smbajwa.com` through `mailto`. Files and filenames are never sent. API responses are cached in IndexedDB for 30 days; the visible clear action removes that cache and the latest locally saved report. Abstracts are discarded and never exported. There are no tracking scripts or API keys.

Crossref `update-to` metadata is classified as retraction, correction/erratum, expression of concern, reinstatement, or other update. Duplicate notices are collapsed. No match is evidence only of an absent match, not proof that a work is correct or unaffected by an update.

## Limitations

- Title search without a DOI can be ambiguous.
- Publisher deposits and Retraction Watch/Crossref metadata can be incomplete or delayed.
- Botanical names, cultivar terms, gene symbols, and author transliterations receive review hints; the tool never silently changes them.
- The tool separates hard failures, discrepancies, and advisories. It does not calculate a trust score or infer misconduct.
- Browser/API behavior in Firefox and Safari remains a manual release check.

## Tests

From the repository root:

```sh
node --test tools/reference-checker/tests/*.test.mjs
node --check tools/reference-checker/app.js
```

Citation.js 0.9.0 is reused from `tools/_shared/vendor/citation-js/0.9.0/`. See `NOTICE` and the site-level `CREDITS.md`.
