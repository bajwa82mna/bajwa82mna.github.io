# Audit notes

Built five static, browser-only tools: Dilution Calculator, qPCR ΔΔCt Calculator, Reverse Complement, Descriptive Statistics, and Journal Figure Resizer. Each includes the shared site shell and sharing UI, strict local CSP, responsive controls, accessible live results, visible how-to/about/limitations/FAQ/related-tool sections, complete JSON-LD and social metadata, cache-busted assets, and method notes. Local examples were added for the first four tools.

Updated the tools directory (including the Plant lab label and 12-tool count), share allow-list/copy, sitemap, credits, notice, and structural count/link tests. Added reference-value tests for dilution, serial dilution, Livak and Pfaffl calculations, IUPAC sequence transforms, descriptive statistics, image dimension conversion, and example fixtures. No journal tool implementation files were changed.

Test results:

- `node --test` from repository root: 148 passed, 0 failed.
- `python3 -m unittest` from `tools/emerging-journals-2026/build`: 15 passed, 0 failed.
- `git diff --check`: clean before commit.

Committed as `8fed696` (`Add five browser-only research tools`). Nothing was pushed or deployed.

Uncertain/manual follow-up: browser-specific canvas resampling and memory limits vary by device; image exports should be visually checked in current Chrome, Safari, and Firefox. The pages were structurally tested but not manually exercised with a screen reader or at an exact 375 px browser viewport.
## 2026-10-08 — Plant Lab Toolkit consolidation

- Merged the audited dilution, qPCR ΔΔCt and reverse-complement cores into `/tools/plant-lab-calculators/`, renamed the visible product to Plant Lab Toolkit, and retained molarity and primer-Tm functions.
- Added three accessible workflow tabs with `?tab=`/hash deep links and active-tab `?example=1` loading; retained local CSV upload, quality flags and CSV download.
- Kept the Experimental label only for primer Tm, as required by `METHODS.md`; dilution, molarity, qPCR and sequence tools are no longer labelled Experimental.
- Replaced the three old tool pages with `noindex` static redirect stubs and removed their cards, sitemap entries, JSON-LD entries and share allow-list entries.
- Ported standalone core/example tests to the consolidated paths and updated the public tool count from thirteen to ten.

## 2026-10-08 — Journal and publishing consolidation

- Merged five journal-facing workflows into `/tools/journal-hub/`: 22,281-journal search and filters, private lexical abstract matching, up-to-five comparison, Emerging Journals trends/counts, combined evidence profiles, and opt-in live Crossref/OpenAlex/DOAJ checks.
- Journal profiles combine identity and ISSNs, subject/country/publisher, open-data trust signals, OA/APC/waiver guidance, DOAJ weeks, Crossref medians with `n`, evidence links, and explicit timing/acceptance-rate caveats.
- Reused the existing Emerging Journals, enrichment, matcher, and timing assets in place. No large dataset was copied into the hub.
- Merged Reference Checker and Identifier Toolkit into `/tools/publishing-toolkit/`, reusing their audited parser, duplicate detector, normalization, detection, and checksum modules.
- Replaced all seven retired pages with strict-CSP, noindex static redirect stubs. The Emerging Journals external redirect script preserves existing `?q=` shared links and opens the selected Journal Hub profile.
- Reduced the public directory, homepage cards, sitemap and JSON-LD ItemList to the five final tools; retained old paths in the share allow-list only for redirect compatibility.
- Added SoftwareApplication, BreadcrumbList, HowTo and FAQPage JSON-LD to both hubs, with matching visible how-to, limitations, FAQ and related-tool content.
- Ported page-level tests to the consolidated interfaces while retaining all core, fixture, data-integrity, XSS and build tests.
- Verification: `node --test` 165/165 passed; Emerging Journals Python tests 15/15 passed; Journal Timing Python tests 5/5 passed. Real Chrome smoke tests confirmed the `Plant Journal` deep-link profile, add/compare workflow, Publishing Toolkit identifier tab, and four valid example identifiers.
- No push or deployment was performed.
