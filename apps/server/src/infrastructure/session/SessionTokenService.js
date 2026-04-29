const crypto = require("node:crypto");

class SessionTokenService {
  constructor({ sessionSecret, sessionTtlSec, cookieName }) {
    this.sessionSecret = sessionSecret;
    this.sessionTtlSec = sessionTtlSec;
    this.cookieName = cookieName;
  }

  createSessionToken(user) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: user.sub || "unknown-user",
      name: user.name || null,
      email: user.email || null,
      provider: "supercell",
      iat: now,
      exp: now + this.sessionTtlSec
    };

    const header = this.#toBase64Url({ alg: "HS256", typ: "JWT" });
    const body = this.#toBase64Url(payload);
    const signature = this.#sign(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  verifySessionToken(token) {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expected = this.#sign(`${header}.${body}`);

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    try {
      const payload = this.#fromBase64Url(body);
      const now = Math.floor(Date.now() / 1000);
      if (!payload.exp || payload.exp < now) return null;
      return payload;
    } catch {
      return null;
    }
  }

  getSessionFromRequest(req) {
    const cookies = this.#parseCookies(req.headers.cookie || "");
    return this.verifySessionToken(cookies[this.cookieName]);
  }

  buildSetCookieHeader(token, secure) {
    const attributes = [
      `${this.cookieName}=${encodeURIComponent(token)}`,
      "Path=/",
      `Max-Age=${this.sessionTtlSec}`,
      "HttpOnly",
      "SameSite=Lax"
    ];

    if (secure) {
      attributes.push("Secure");
    }

    return attributes.join("; ");
  }

  buildClearCookieHeader(secure) {
    const attributes = [
      `${this.cookieName}=`,
      "Path=/",
      "Max-Age=0",
      "HttpOnly",
      "SameSite=Lax"
    ];

    if (secure) {
      attributes.push("Secure");
    }

    return attributes.join("; ");
  }

  #sign(data) {
    return crypto.createHmac("sha256", this.sessionSecret).update(data).digest("base64url");
  }

  #toBase64Url(data) {
    return Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  }

  #fromBase64Url(encoded) {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  }

  #parseCookies(rawCookie) {
    if (!rawCookie) return {};

    return rawCookie.split(";").reduce((acc, part) => {
      const [rawKey, ...rest] = part.trim().split("=");
      if (!rawKey) return acc;
      acc[rawKey] = decodeURIComponent(rest.join("=") || "");
      return acc;
    }, {});
  }
}

module.exports = { SessionTokenService };
