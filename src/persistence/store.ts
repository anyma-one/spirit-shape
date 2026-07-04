// A tiny key-value store abstraction. Phase 2 needs persistence for save-resume
// and to record completed results for the cross-tier continuity feature (Phase 3).
//
// The interface is deliberately minimal so the localStorage backend used now can
// be swapped for a serverless KV / Postgres later (spec §10, §11) without touching
// callers.

export interface KVStore {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  /** All keys beginning with the given prefix. */
  keys(prefix: string): string[];
}

const PREFIX = "sa:"; // namespace so we never collide with other localStorage users.

class LocalStorageStore implements KVStore {
  constructor(private storage: Storage) {}

  get<T>(key: string): T | null {
    try {
      const raw = this.storage.getItem(PREFIX + key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      return null; // corrupt/old data shouldn't crash the app.
    }
  }

  set<T>(key: string, value: T): void {
    try {
      this.storage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Quota exceeded / private mode — degrade silently; the app still works.
    }
  }

  remove(key: string): void {
    try {
      this.storage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  }

  keys(prefix: string): string[] {
    const out: string[] = [];
    try {
      for (let i = 0; i < this.storage.length; i++) {
        const k = this.storage.key(i);
        if (k && k.startsWith(PREFIX + prefix)) out.push(k.slice(PREFIX.length));
      }
    } catch {
      /* ignore */
    }
    return out;
  }
}

// In-memory fallback for SSR / tests / environments without localStorage.
class MemoryStore implements KVStore {
  private map = new Map<string, string>();
  get<T>(key: string): T | null {
    const raw = this.map.get(key);
    return raw === undefined ? null : (JSON.parse(raw) as T);
  }
  set<T>(key: string, value: T): void {
    this.map.set(key, JSON.stringify(value));
  }
  remove(key: string): void {
    this.map.delete(key);
  }
  keys(prefix: string): string[] {
    return [...this.map.keys()].filter((k) => k.startsWith(prefix));
  }
}

function createStore(): KVStore {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      // Probe — Safari private mode throws on setItem.
      const probe = PREFIX + "__probe__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return new LocalStorageStore(window.localStorage);
    }
  } catch {
    /* fall through to memory */
  }
  return new MemoryStore();
}

export const store: KVStore = createStore();
