# Journal Timing methods

The build joins DOAJ and the Emerging Journals 2026 list only by normalized print ISSN or e-ISSN. Titles are never used for matching. DOAJ's CC0 field “Average number of weeks between article submission and publication” is retained as a self-reported value.

For a prioritized subset, the build requests Crossref journal articles published in the previous three years (up to 300 works per journal). It parses case-insensitive `Received` and `Accepted` assertions plus `published-online`, falling back to `published`. Invalid calendar dates, reversed event order, and spans over ten years are rejected and counted. Per-journal medians and linearly interpolated 25th/75th percentiles are emitted only where a metric has at least 10 observations. Article-level records remain in the ignored `build/cache/` directory.

Run from the repository root:

`python3 tools/journal-timing/build/build.py --doaj-csv /path/to/doaj.csv --max-journals 25`

The static page never calls either service. Acceptance rates are not inferred: published articles exclude rejected manuscripts and cannot supply the necessary denominator.
