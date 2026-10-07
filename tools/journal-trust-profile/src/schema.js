export const STATUS = Object.freeze({ confirmed: 'confirmed', conflicting: 'conflicting', absent: 'absent', unchecked: 'not checked' });

export function claim({ field, label, value = null, status = STATUS.unchecked, evidence = [], note = '' }) {
  return { field, label, value, status, evidence, note };
}

export function sourceEvidence(source, url, retrievedAt, value, details = '') {
  return { source, url, retrievedAt, value, details };
}

export function emptyProfile(query) {
  return { schemaVersion: 1, query, generatedAt: new Date().toISOString(), identity: {}, claims: [], conflicts: [], works: [], checklist: {} };
}
