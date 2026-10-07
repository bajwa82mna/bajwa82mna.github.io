const PREFIX = 'oa-apc-explorer:';
export function readCache(key, maxAge = 30 * 864e5) {
  try { const entry = JSON.parse(localStorage.getItem(PREFIX + key)); return entry && Date.now() - entry.savedAt < maxAge ? entry.value : null; } catch { return null; }
}
export function writeCache(key, value) { try { localStorage.setItem(PREFIX + key, JSON.stringify({savedAt: Date.now(), value})); } catch {} }
export function clearCache() { Object.keys(localStorage).filter(key => key.startsWith(PREFIX)).forEach(key => localStorage.removeItem(key)); }
