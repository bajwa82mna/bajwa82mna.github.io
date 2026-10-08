# Journal Timing methods

The build joins DOAJ and the Emerging Journals 2026 list only by normalized print ISSN or e-ISSN. Titles are never used for matching. DOAJ's CC0 field “Average number of weeks between article submission and publication” is retained as a self-reported value.

For a prioritized subset, the build requests Crossref journal articles published in the previous 1,096 days (up to 300 works per journal). It parses case-insensitive `Received` and `Accepted` assertions plus `published-online`, falling back to `published`. Invalid calendar dates, reversed event order, and spans over ten years are rejected and counted. Per-journal medians and linearly interpolated 25th/75th percentiles are emitted only where a metric has at least 10 observations. Article-level records remain in the ignored `build/cache/` directory, so interrupted batches resume without refetching cached ISSNs.

All ISSN-joinable journals are written to deterministic JSON shards under `data/shards/`. The first two hexadecimal characters of SHA-1(normalized ISSN) select a shard; records with two ISSNs are present in both applicable shards. Two-character normalized-title indexes under `data/titles/` support title search without an up-front multi-megabyte download. `manifest.json` contains only schema information, subjects, counts, and examples.

Run from the repository root:

`python3 tools/journal-timing/build/build.py --doaj-csv /path/to/doaj.csv --max-journals 6000`

Snapshot search loads only first-party title and timing shards. A user may explicitly request a live Crossref summary for one selected ISSN. That request uses the same window, fields, validation, suppression, and rounding as the Python build; it sends no email or personal data. Results are cached locally for 30 days and can be cleared in the UI. Acceptance rates are not inferred: published articles exclude rejected manuscripts and cannot supply the necessary denominator.
