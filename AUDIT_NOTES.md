# Audit notes

Built five static, browser-only tools: Dilution Calculator, qPCR ΔΔCt Calculator, Reverse Complement, Descriptive Statistics, and Journal Figure Resizer. Each includes the shared site shell and sharing UI, strict local CSP, responsive controls, accessible live results, visible how-to/about/limitations/FAQ/related-tool sections, complete JSON-LD and social metadata, cache-busted assets, and method notes. Local examples were added for the first four tools.

Updated the tools directory (including the Plant lab label and 12-tool count), share allow-list/copy, sitemap, credits, notice, and structural count/link tests. Added reference-value tests for dilution, serial dilution, Livak and Pfaffl calculations, IUPAC sequence transforms, descriptive statistics, image dimension conversion, and example fixtures. No journal tool implementation files were changed.

Test results:

- `node --test` from repository root: 148 passed, 0 failed.
- `python3 -m unittest` from `tools/emerging-journals-2026/build`: 15 passed, 0 failed.
- `git diff --check`: clean before commit.

Committed as `8fed696` (`Add five browser-only research tools`). Nothing was pushed or deployed.

Uncertain/manual follow-up: browser-specific canvas resampling and memory limits vary by device; image exports should be visually checked in current Chrome, Safari, and Firefox. The pages were structurally tested but not manually exercised with a screen reader or at an exact 375 px browser viewport.
