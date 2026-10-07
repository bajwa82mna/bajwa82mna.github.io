const TTL = 30 * 24 * 60 * 60 * 1000;
export function createCache(namespace = 'journal-trust-profile', storage = globalThis.localStorage) {
  return {
    get(key) { try { const item = JSON.parse(storage.getItem(`${namespace}:${key}`)); if (!item || Date.now() - item.savedAt > TTL) { storage.removeItem(`${namespace}:${key}`); return null; } return item.value; } catch { return null; } },
    set(key, value) { try { storage.setItem(`${namespace}:${key}`, JSON.stringify({ savedAt: Date.now(), value })); } catch {} },
    clear() { try { Object.keys(storage).filter(k => k.startsWith(`${namespace}:`)).forEach(k => storage.removeItem(k)); } catch {} }
  };
}
