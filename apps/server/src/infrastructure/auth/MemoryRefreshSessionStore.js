class MemoryRefreshSessionStore {
  constructor() {
    this.sessions = new Map();
  }

  createOrReplaceSession({ sessionId, tokenId, expiresAtSec }) {
    this.#cleanupExpired();
    this.sessions.set(sessionId, {
      tokenId,
      expiresAtSec
    });
  }

  rotate({ sessionId, currentTokenId, nextTokenId, nextExpiresAtSec }) {
    this.#cleanupExpired();
    const session = this.sessions.get(sessionId);
    const now = Math.floor(Date.now() / 1000);

    if (!session) return false;
    if (session.expiresAtSec <= now) {
      this.sessions.delete(sessionId);
      return false;
    }

    if (session.tokenId !== currentTokenId) {
      this.sessions.delete(sessionId);
      return false;
    }

    this.sessions.set(sessionId, {
      tokenId: nextTokenId,
      expiresAtSec: nextExpiresAtSec
    });
    return true;
  }

  revoke(sessionId) {
    this.sessions.delete(sessionId);
  }

  #cleanupExpired() {
    const now = Math.floor(Date.now() / 1000);
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAtSec <= now) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

module.exports = { MemoryRefreshSessionStore };
