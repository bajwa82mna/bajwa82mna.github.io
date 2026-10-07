# Methodology and limitations

## What the matcher does

The page normalizes Unicode and punctuation, removes a short documented set of generic words, weights title and keyword terms more heavily, and optionally expands detected plant-science topic groups. MiniSearch 7.2.0 performs local BM25-style lexical retrieval over journal titles, original aggregate topic labels, and broad subject terms. A deterministic post-pass caps any publisher at two results when diversity is enabled.

The displayed fit percentage is normalized against the best result in the current shortlist. It is not comparable across manuscripts and is not a probability.

## Evidence axes

Topical fit and journal evidence remain separate. OA/APC flags in the compact seed are filters, not ranking boosts. On request, the page sends only an ISSN to OpenAlex, Crossref, and DOAJ and displays each provider's response or error independently. Missing data never means “No.” Always verify current aims, article types, fees, waivers, and policies at the journal.

## Vocabulary

The local groups cover abiotic stress, plant genetics, crop improvement, pathology, physiology, soil–plant systems, common methods, and representative crops. Expansion is visible and switchable. It cannot capture every discipline, non-English concept, cultivar, emerging method, or interdisciplinary framing.

## Limitations

- A 28-journal seed is deliberately compact and incomplete.
- Lexical similarity cannot measure editorial interest, novelty, quality, acceptance chance, speed, or ethics.
- Publisher diversity is a presentation constraint, not a judgment about publishers.
- OA/APC declarations change. Live data may be stale, incomplete, rate-limited, or contradictory.
- The initial relevance fixtures are engineering checks, not a blinded expert benchmark. Domain review and a larger held-out evaluation remain necessary before treating recall metrics as meaningful.

No Clarivate, Scopus, CAS, Journal Impact Factor, copied abstract, or publisher aims-and-scope data is used.
