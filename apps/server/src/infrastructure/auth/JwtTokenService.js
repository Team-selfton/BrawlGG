const crypto = require("node:crypto");

class JwtTokenService {
  constructor({ secret, issuer, audience, accessTokenTtlSec, refreshTokenTtlSec }) {
    this.secret = secret;
    this.issuer = issuer;
    this.audience = audience;
    this.accessTokenTtlSec = accessTokenTtlSec;
    this.refreshTokenTtlSec = refreshTokenTtlSec;
  }

  createAccessToken(user, sessionId) {
    return this.#createToken(
      {
        type: "access",
        sub: user.sub || "unknown-user",
        sid: sessionId,
        name: user.name || null,
        email: user.email || null,
        provider: user.provider || "supercell"
      },
      this.accessTokenTtlSec
    );
  }

  createRefreshToken(user, sessionId, refreshTokenId) {
    return this.#createToken(
      {
        type: "refresh",
        sub: user.sub || "unknown-user",
        sid: sessionId,
        jti: refreshTokenId,
        name: user.name || null,
        email: user.email || null,
        provider: user.provider || "supercell"
      },
      this.refreshTokenTtlSec
    );
  }

  verifyAccessToken(token) {
    return this.#verifyToken(token, "access");
  }

  verifyRefreshToken(token) {
    return this.#verifyToken(token, "refresh");
  }

  getAccessPayloadFromRequest(req) {
    const token = this.extractBearerTokenFromRequest(req);
    return this.verifyAccessToken(token);
  }

  extractBearerTokenFromRequest(req) {
    const header = req && req.headers ? req.headers.authorization : "";
    if (!header || typeof header !== "string") return "";

    const parts = header.split(" ");
    if (parts.length !== 2) return "";
    if (parts[0].toLowerCase() !== "bearer") return "";
    return parts[1].trim();
  }

  createRefreshTokenId() {
    return crypto.randomBytes(24).toString("base64url");
  }

  #createToken(payload, ttlSec) {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iss: this.issuer,
      aud: this.audience,
      iat: now,
      exp: now + ttlSec
    };

    const header = this.#toBase64Url({ alg: "HS256", typ: "JWT" });
    const body = this.#toBase64Url(tokenPayload);
    const signature = this.#sign(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  #verifyToken(token, expectedType) {
    if (!token || typeof token !== "string") return null;

    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSignature = this.#sign(`${header}.${body}`);

    const signatureBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    try {
      const payload = this.#fromBase64Url(body);
      const now = Math.floor(Date.now() / 1000);

      if (payload.type !== expectedType) return null;
      if (!payload.exp || payload.exp <= now) return null;
      if (!payload.iat || payload.iat > now + 60) return null;
      if (payload.iss !== this.issuer) return null;
      if (payload.aud !== this.audience) return null;

      return payload;
    } catch {
      return null;
    }
  }

  #sign(data) {
    return crypto.createHmac("sha256", this.secret).update(data).digest("base64url");
  }

  #toBase64Url(data) {
    return Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  }

  #fromBase64Url(encoded) {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  }
}

module.exports = { JwtTokenService };
