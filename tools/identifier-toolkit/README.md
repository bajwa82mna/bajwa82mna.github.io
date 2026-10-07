# Identifier & Citation Toolkit

## Sharing

The shared privacy-first dialog shares only this tool's public URL and fixed descriptive text. Entered identifiers, citation data, metadata, and results are never placed in share URLs. QR codes are generated locally.

An experimental, static-browser workbench by Shoaib Munir / smbajwa.com for DOI, ISSN and ORCID recognition, checksum validation, public metadata lookup and citation export.

## Privacy and data flow

Recognition, normalization, checksum validation, Citation.js parsing and exports run locally. The page sends only a selected valid identifier after the user clicks the online lookup button and confirms the displayed domains. Crossref is the default provider; OpenAlex and DOAJ are opt-in. OpenAlex requests include `mailto=contact@smbajwa.com`. ORCID use is limited to validation and a public-record link. No API keys, client secrets, analytics or tracking scripts are included.

Lookup responses are cached in browser `localStorage` for 30 days and can be cleared in the interface. Input and recent history are not stored. Abstract fields are intentionally discarded and excluded from exports.

## Limits

Syntax or checksum validity does not prove that an identifier is assigned. Public metadata may be absent, stale or conflicting. Provider errors are shown without converting missing evidence into a negative claim. Browser CORS and provider quotas can change.

## Tests

```sh
node --test tools/identifier-toolkit/tests/*.test.mjs
node --check tools/identifier-toolkit/app.js
```

## Credits

Built on Citation.js 0.9.0 (MIT) by Lars Willighagen and contributors. See `NOTICE`, the shared vendored license, and the site-level `CREDITS.md`.
