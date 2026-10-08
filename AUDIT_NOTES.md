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

## 2026-10-08 — Full parity restoration

The consolidated hubs now lazy-mount the complete audited applications from `64c75cf`. The legacy URLs use one allow-listed redirect gate; `?embed=1` is reserved for same-origin hub mounts.

| Old feature | New location | Parity test |
|---|---|---|
| Trust identity reconciliation and conflicts | Journal Hub → Check / combined profile | `journal-trust-profile/tests/unit/reconcile.test.mjs`, `tests/full-parity.test.mjs` |
| Trust source-backed claims, live normalized lookups and provenance | Journal Hub → Check | `journal-trust-profile/tests/integration/adapters.test.mjs`, `tests/full-parity.test.mjs` |
| Trust checklist, cache controls, dossier export and print | Journal Hub → Check | `journal-trust-profile/tests/e2e/static-check.mjs`, `tests/full-parity.test.mjs` |
| APC amount, no-fee/unknown, waiver and licence evidence | Journal Hub → Find / combined profile | `oa-apc-explorer/tests/unit/core.test.mjs`, `tests/full-parity.test.mjs` |
| APC filters, comparison export and budget calculator | Journal Hub → Find | `oa-apc-explorer/tests/unit/budget.test.mjs`, `tests/full-parity.test.mjs` |
| Matcher exclusions and vocabulary expansion | Journal Hub → Match | `abstract-journal-matcher/tests/unit/preprocess.test.mjs`, `tests/full-parity.test.mjs` |
| Matcher publisher diversification and OA/no-APC filters | Journal Hub → Match | `abstract-journal-matcher/tests/unit/filters-rerank.test.mjs`, `tests/full-parity.test.mjs` |
| Matcher signal feedback, evidence refresh/cache clear, CSV/JSON export | Journal Hub → Match | `abstract-journal-matcher/tests/unit/export.test.mjs`, `tests/full-parity.test.mjs` |
| Timing filters, sortable measures/n, total/IQR/n/retrieval/coverage and CSV | Journal Hub → Find / combined profile | `journal-timing/tests/ui.test.mjs`, `tests/full-parity.test.mjs` |
| Emerging search, filters, trends and share links | Journal Hub → Trends | `emerging-journals-2026/build/test_ui.mjs`, `tests/full-parity.test.mjs` |
| Shared journal selection and mode-aware `q` | Journal Hub → Combined profile | `tests/full-parity.test.mjs`, `tests/consolidation.test.mjs` |
| Citation.js BibTeX/RIS/CSL-JSON parsing and file upload | Publishing Toolkit → Reference checker | `reference-checker/tests/core.test.mjs`, `reference-checker/tests/page-qa.test.mjs` |
| Crossref/OpenAlex checks, discrepancies, updates/retractions and provenance | Publishing Toolkit → Reference checker | `reference-checker/tests/core.test.mjs`, `tests/full-parity.test.mjs` |
| Saved reports/cache clear, locales and JSON/CSV/Markdown export | Publishing Toolkit → Reference checker | `reference-checker/tests/page-qa.test.mjs`, `tests/full-parity.test.mjs` |
| Identifier lookups, source comparison, cache and citation rendering/copy | Publishing Toolkit → Identifier toolkit | `identifier-toolkit/tests/shared.test.mjs`, `tests/full-parity.test.mjs` |
| Identifier JSON/CSV/BibTeX/RIS export | Publishing Toolkit → Identifier toolkit | `identifier-toolkit/tests/identifier.test.mjs`, `tests/full-parity.test.mjs` |
| Sequence operation selector and multi-record FASTA download | Plant Lab Toolkit → Sequence | `tests/full-parity.test.mjs`, `plant-lab-calculators/tests/static.test.mjs` |
| Legacy `example`, `q`, `journal`, mode and tab redirects | Shared legacy redirect | `tests/full-parity.test.mjs`, `tests/consolidation.test.mjs` |
| Lazy workflow assets and initial page-weight budget | Journal Hub mounts | `tests/full-parity.test.mjs` |
| One cache version across each reachable HTML module/CSS graph | Release `v=15` | `tests/module-cache-version.test.mjs` |

## 2026-10-08 — Embedded tool shell and responsive mounts

- Added one shared, strict-CSP-compatible embed bridge at `tools/_shared/js/embed.js` and `tools/_shared/css/embed.css`, both on release `v=15`. `?embed=1` is applied before page content is parsed; embedded pages hide the site bar, breadcrumb/hero chrome, share controls, duplicate how-to content and footer while retaining tool controls and results.
- Added same-origin, exact-window validation for parent theme messages and same-origin, exact-iframe-source validation for height messages. Embedded tools report visible content height through `ResizeObserver`; Journal Hub and Publishing Toolkit remove fixed minimum heights and disable iframe scrolling.
- Journal Hub now declares one iframe per tool. Compare reuses the existing trust, OA/APC, timing and matcher frame elements, while lazy loading remains based on `data-src`. Legacy `?q=`/`?journal=` selection updates the one shared set of frames and the combined-profile status.
- Added Node regressions for embed flag behavior, parent/frame message validation, duplicate frame sources and shared asset/release-version coverage.
- Verification: `node --test` 174/174 passed; Emerging Journals Python tests 15/15 passed; Journal Timing Python tests 5/5 passed; `git diff --check` clean.
- Real Chrome smoke check (local HTTP): all five Journal Hub tabs activated; Find showed the OA/APC and timing controls without nested chrome, Match loaded on demand, Compare contained four unique reused frames, Trends loaded on demand, and Check reused the single trust frame. `?mode=compare&q=Plant+Journal` synchronized all four profile URLs and displayed `Combined evidence for Plant Journal`. Publishing Toolkit switched between both lazily loaded modes with measured heights (1194 px and 1212 px in the smoke viewport) and no embedded header/site bar/footer. Plant Lab Toolkit switched among dilution, qPCR and sequence modes; its `?embed=1` view kept the workflow controls while hiding outer chrome and duplicate how-to content.

## 2026-10-08 — Central tool privacy and source register

- Added canonical `/tools/privacy-and-sources/` with a per-workflow network register, local-processing boundaries, data sources and licences, collection exclusions, file and comparison limits, and a contact-free presentation.
- Replaced repeated privacy/network panels across the five public tools and seven embedded implementations with compact links to the register. Notices remain beside controls that trigger OpenAlex, Crossref or DOAJ requests.
- Added worked examples to all five public tools, expanded Plant Lab Toolkit to five visible FAQs, and retained the existing numbered how-to, limitations and related-tool guidance.
- Linked the register from the tools index, site footer and credits footer, and added it to the sitemap without adding it to the share allow-list.
- Privacy regressions now require a central link on every rendered tool, factual notices beside external-call controls, and coverage of every external host allowed by any rendered tool’s `connect-src`.
- Verification: `node --test` passed 177/177; Emerging Journals Python passed 15/15; Journal Timing Python passed 5/5; `git diff --check` was clean. Chrome smoke checks passed for the central register, Journal Hub, Publishing Toolkit and Descriptive Statistics, including visible privacy links and worked examples.
