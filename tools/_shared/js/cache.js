export function createMemoryCache({ ttl = 30 * 24 * 60 * 60 * 1000, now = Date.now } = {}) {
  const values = new Map();
  return {
    get(key) {
      const entry = values.get(key);
      if (!entry || now() - entry.savedAt > ttl) { values.delete(key); return null; }
      return entry.value;
    },
    set(key, value) { values.set(key, { value, savedAt: now() }); },
    clear() { values.clear(); }
  };
}

export function createLocalCache(namespace, options = {}) {
  const ttl = options.ttl ?? 30 * 24 * 60 * 60 * 1000;
  return {
    get(key) {
      try {
        const item = JSON.parse(localStorage.getItem(`${namespace}:${key}`));
        if (!item || Date.now() - item.savedAt > ttl) { localStorage.removeItem(`${namespace}:${key}`); return null; }
        return item.value;
      } catch { return null; }
    },
    set(key, value) { try { localStorage.setItem(`${namespace}:${key}`, JSON.stringify({ savedAt: Date.now(), value })); } catch {} },
    clear() { try { Object.keys(localStorage).filter(key => key.startsWith(`${namespace}:`)).forEach(key => localStorage.removeItem(key)); } catch {} }
  };
}
