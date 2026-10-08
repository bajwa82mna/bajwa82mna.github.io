# Consolidated tool methods

## Journal Hub

Journal Hub loads the existing 22,281-row Emerging Journals 2026 ranking and its aligned OpenAlex enrichment once, then joins the Journal Timing snapshot in memory by normalized ISSN, with normalized title used only when no ISSN join is available. No large dataset is copied into the hub.

Find performs local title and ISSN filtering. Match my abstract reuses the MiniSearch 7.2.0 lexical index and preprocessing pipeline; manuscript text stays in the browser and scores indicate relative word overlap only. Compare stores at most five selected public journal records in memory. Check one journal requests current public records from Crossref, OpenAlex and DOAJ only after the user submits a public title or ISSN.

DOAJ weeks are journal-reported. Crossref medians describe only published articles with usable deposited dates and include the observation count; rejected manuscripts are absent. Acceptance rate is “Not openly available” and is never inferred. No Clarivate, Scopus, CAS, Journal Impact Factor or bundled SJR data is used.

## Publishing Toolkit

Publishing Toolkit reuses the standalone tools’ parsing, DOI normalization, duplicate detection, identifier detection and checksum modules. Local analysis accepts reference text and mixed DOI, ISSN, ISBN and ORCID input without transmitting it. Structural validity or a checksum does not prove that an identifier exists or that its metadata is correct.

## Redirect policy

The seven retired URLs are noindex static stubs with canonical links to the relevant hub. The Emerging Journals stub uses a small external script to carry an existing `?q=` journal title into the Journal Hub profile URL.
