class MemoryOAuthStateStore {
  constructor({ ttlMs }) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  save(state, payload) {
    this.#pruneExpired();
    this.store.set(state, {
      payload,
      createdAt: Date.now()
    });
  }

  consume(state) {
    this.#pruneExpired();
    const item = this.store.get(state);
    this.store.delete(state);

    if (!item) return null;
    if (Date.now() - item.createdAt > this.ttlMs) return null;

    return item.payload;
  }

  #pruneExpired() {
    const now = Date.now();
    for (const [state, item] of this.store.entries()) {
      if (now - item.createdAt > this.ttlMs) {
        this.store.delete(state);
      }
    }
  }
}

module.exports = { MemoryOAuthStateStore };
