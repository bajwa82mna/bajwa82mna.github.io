# Profile pipeline

`build-index.mjs` validates and deterministically normalizes the checked-in compact profiles. In this static v1, MiniSearch builds the small index at runtime so its tokenization and field boosts remain inspectable. `validate-index.mjs` checks uniqueness, required fields, identifiers, prohibited fields, and the manifest record count.

Future bulk enrichment should consume only licensed CC0 fields from DOAJ/OpenAlex, cache politely, record retrieval dates, and never make the browser depend on a complete OpenAlex batch. Do not import Crossref abstracts or publisher scope prose.
