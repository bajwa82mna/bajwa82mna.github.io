# Journal Trust Profile

An experimental, client-side evidence dossier for journal identity, open-access declarations, preservation, publication signals, and source conflicts. It deliberately produces no trust score, blacklist label, or submission endorsement.

## Sources and privacy

- Local suggestions: a minimized seed derived from `../emerging-journals-2026/data.js` on 2026-10-07.
- Live lookups after explicit confirmation: DOAJ, OpenAlex (with `mailto=contact@smbajwa.com`), and Crossref.
- Cache: browser local storage, 30-day expiry, visibly clearable.
- Checklist notes: session storage only and included in an explicit JSON download.
- No tracking, API keys, editor/contact collection, publisher-page scraping, Clarivate/Scopus/CAS data, or JIF values.

Missing provider metadata is displayed as absent/not checked and never converted into a negative declaration. Current journal policies and fees must be verified at source.

## Build and tests

```sh
node build-seed.mjs
node --test tests/unit/*.test.mjs tests/integration/*.test.mjs
node tests/e2e/static-check.mjs
```

Fuse.js 7.5.0 is vendored unmodified under `third_party/fuse/7.5.0/`; see `NOTICE` and `UPSTREAM.json`.
