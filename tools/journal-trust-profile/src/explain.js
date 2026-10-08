import { STATUS, claim, sourceEvidence } from './schema.js?v=18';
import { subjectFit } from './reconcile.js?v=18';

export function buildEvidenceClaims(records, works = []) {
  const doaj = records.find(r => r?.source === 'DOAJ');
  const oa = records.find(r => r?.source === 'OpenAlex');
  const crossref = records.find(r => r?.source === 'Crossref');
  const ev = r => r ? [sourceEvidence(r.source, r.url, r.retrievedAt, true)] : [];
  return [
    claim({ field: 'doaj', label: 'DOAJ record', value: doaj ? 'Listed in the returned DOAJ metadata' : null, status: doaj ? STATUS.confirmed : STATUS.absent, evidence: ev(doaj), note: doaj ? '' : 'No match was returned. Omission is not evidence of poor quality.' }),
    claim({ field: 'oa', label: 'Open-access signal', value: doaj ? 'Open-access journal in DOAJ' : oa?.oa === true ? 'OpenAlex marks the source open access' : null, status: doaj || oa?.oa === true ? STATUS.confirmed : STATUS.absent, evidence: [...ev(doaj), ...ev(oa)], note: !doaj && oa?.oa !== true ? 'No affirmative OA signal was returned; this does not establish that access is closed.' : '' }),
    claim({ field: 'apc', label: 'APC declaration', value: doaj?.apc || null, status: doaj?.apc ? STATUS.confirmed : doaj ? STATUS.absent : STATUS.unchecked, evidence: ev(doaj), note: doaj && !doaj.apc ? 'Not reported in the returned DOAJ metadata; confirm current fees on the journal site.' : '' }),
    claim({ field: 'waiver', label: 'Waiver information', value: doaj?.waiver ?? null, status: doaj?.waiver != null ? STATUS.confirmed : doaj ? STATUS.absent : STATUS.unchecked, evidence: ev(doaj), note: 'A missing field is not a “No” declaration.' }),
    claim({ field: 'license', label: 'Article licenses', value: doaj?.licenses?.length ? doaj.licenses : null, status: doaj?.licenses?.length ? STATUS.confirmed : doaj ? STATUS.absent : STATUS.unchecked, evidence: ev(doaj) }),
    claim({ field: 'copyright', label: 'Author copyright retention', value: doaj?.copyright ?? null, status: doaj?.copyright != null ? STATUS.confirmed : doaj ? STATUS.absent : STATUS.unchecked, evidence: ev(doaj) }),
    claim({ field: 'preservation', label: 'Preservation services', value: doaj?.preservation?.length ? doaj.preservation : null, status: doaj?.preservation?.length ? STATUS.confirmed : doaj ? STATUS.absent : STATUS.unchecked, evidence: ev(doaj) }),
    claim({ field: 'seal', label: 'DOAJ Seal', value: doaj ? (doaj.doajSeal ? 'Reported' : 'Not reported') : null, status: doaj?.doajSeal ? STATUS.confirmed : doaj ? STATUS.absent : STATUS.unchecked, evidence: ev(doaj), note: 'Seal status is one metadata field, not an endorsement by this tool.' }),
    claim({ field: 'coverage', label: 'Publication coverage', value: { openAlexWorks: oa?.worksCount ?? null, crossrefWorks: crossref?.worksCount ?? null }, status: oa || crossref ? STATUS.confirmed : STATUS.unchecked, evidence: [...ev(oa), ...ev(crossref)], note: 'Provider counts use different coverage rules and may disagree.' }),
    claim({ field: 'plant', label: 'Plant-science context', value: [...new Set(records.flatMap(subjectFit))], status: records.some(r => subjectFit(r).length) || works.length ? STATUS.confirmed : STATUS.absent, evidence: [...ev(doaj), ...ev(oa)], note: 'Keyword overlap is context only; read the current aims and scope.' })
  ];
}

export function statusExplanation(status) {
  return ({ confirmed: 'At least one named source returned supporting metadata.', conflicting: 'Named sources disagree or the returned identity does not match the query.', absent: 'The named source returned no affirmative field or record. This is not a negative declaration.', 'not checked': 'No usable source response was available.' })[status] || '';
}
