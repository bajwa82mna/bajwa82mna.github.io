# Abstract-to-Journal Matcher

A static, browser-only plant-science discovery tool by Shoaib Munir / smbajwa.com. It ranks a compact set of journal profiles with MiniSearch and explains matched topics and terms. It is not an acceptance predictor, quality ranking, or endorsement.

## Privacy and network behavior

Title, abstract, keywords, exclusions, results, and exports remain in browser memory. They are not persisted or transmitted. Clicking **Refresh public evidence** sends only the selected journal ISSN to OpenAlex, Crossref, and DOAJ. Responses are cached in `localStorage` for 30 days and can be cleared in the interface.

## Data boundaries

The checked-in profiles contain journal identity, original aggregate topic labels, and broad terms—not abstracts or copied publisher scope prose. The seed was reviewed on 2026-10-07. Live services can be unavailable or return conflicting/missing metadata; the interface reports those errors separately.

## Develop and test

Serve the repository root over HTTP, then open `/tools/abstract-journal-matcher/`.

```sh
cd tools/abstract-journal-matcher
npm test
npm run validate
```

No install or build step is required.
