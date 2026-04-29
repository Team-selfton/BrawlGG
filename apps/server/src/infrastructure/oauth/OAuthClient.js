const crypto = require("node:crypto");
const { URL, URLSearchParams } = require("node:url");
const { HttpError } = require("../../domain/errors/HttpError");

class OAuthClient {
  constructor(oauthConfig) {
    this.config = oauthConfig;
  }

  get enabled() {
    return Boolean(this.config.enabled);
  }

  createAuthorizationRequest({ state }) {
    if (!this.enabled) {
      throw new HttpError(503, "OAUTH_NOT_CONFIGURED", "Supercell OAuth is not configured.");
    }

    const codeVerifier = crypto.randomBytes(64).toString("base64url");
    const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

    const authorizationUrl = new URL(this.config.authorizationUrl);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", this.config.clientId);
    authorizationUrl.searchParams.set("redirect_uri", this.config.redirectUri);
    authorizationUrl.searchParams.set("scope", this.config.scope);
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("code_challenge", codeChallenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");

    if (this.config.audience) {
      authorizationUrl.searchParams.set("audience", this.config.audience);
    }

    return {
      authorizationUrl: authorizationUrl.toString(),
      codeVerifier
    };
  }

  async exchangeCode({ code, codeVerifier }) {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier
    });

    if (this.config.clientSecret) {
      body.set("client_secret", this.config.clientSecret);
    }

    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body
    });

    const text = await response.text();
    const payload = this.#safeParseJson(text);

    if (!response.ok) {
      throw new HttpError(
        502,
        "TOKEN_EXCHANGE_FAILED",
        payload.error_description || payload.error || "OAuth token exchange failed.",
        payload
      );
    }

    return payload;
  }

  async resolveUserProfile(tokenPayload) {
    if (this.config.userinfoUrl && tokenPayload.access_token) {
      const response = await fetch(this.config.userinfoUrl, {
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
          Accept: "application/json"
        }
      });

      if (response.ok) {
        const userInfo = await response.json();
        return {
          sub: userInfo.sub || userInfo.id || userInfo.user_id,
          name: userInfo.name || userInfo.nickname || userInfo.preferred_username || null,
          email: userInfo.email || null
        };
      }
    }

    const idTokenPayload = this.#parseJwtPayload(tokenPayload.id_token);
    if (idTokenPayload) {
      return {
        sub: idTokenPayload.sub,
        name: idTokenPayload.name || idTokenPayload.preferred_username || null,
        email: idTokenPayload.email || null
      };
    }

    const fallbackId = tokenPayload.access_token
      ? crypto.createHash("sha256").update(tokenPayload.access_token).digest("hex").slice(0, 24)
      : crypto.randomBytes(12).toString("hex");

    return {
      sub: `supercell-${fallbackId}`,
      name: null,
      email: null
    };
  }

  #parseJwtPayload(jwt) {
    if (!jwt || typeof jwt !== "string") return null;
    const parts = jwt.split(".");
    if (parts.length < 2) return null;

    try {
      return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    } catch {
      return null;
    }
  }

  #safeParseJson(text) {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { message: text || "Unexpected OAuth response." };
    }
  }
}

module.exports = { OAuthClient };
