const crypto = require("node:crypto");
const { HttpError } = require("../../domain/errors/HttpError");

class AuthService {
  constructor({ oauthClient, oauthStateStore, jwtTokenService, refreshSessionStore }) {
    this.oauthClient = oauthClient;
    this.oauthStateStore = oauthStateStore;
    this.jwtTokenService = jwtTokenService;
    this.refreshSessionStore = refreshSessionStore;
  }

  getAuthStatus(req) {
    const accessPayload = this.jwtTokenService.getAccessPayloadFromRequest(req);

    return {
      authenticated: Boolean(accessPayload),
      oauthEnabled: this.oauthClient.enabled,
      tokenType: "Bearer",
      user: accessPayload
        ? {
            sub: accessPayload.sub,
            name: accessPayload.name,
            email: accessPayload.email,
            provider: accessPayload.provider
          }
        : null
    };
  }

  startOAuthLogin(returnTo) {
    const state = crypto.randomBytes(24).toString("base64url");
    const safeReturnTo = this.#sanitizeReturnTo(returnTo);
    const { authorizationUrl, codeVerifier } = this.oauthClient.createAuthorizationRequest({ state });

    this.oauthStateStore.save(state, {
      codeVerifier,
      returnTo: safeReturnTo
    });

    return {
      authorizationUrl
    };
  }

  async completeOAuthLogin({ code, state, error, errorDescription }) {
    if (error) {
      throw new HttpError(400, "OAUTH_PROVIDER_ERROR", errorDescription || error);
    }

    if (!code || !state) {
      throw new HttpError(400, "INVALID_OAUTH_CALLBACK", "Missing code or state in callback.");
    }

    const stateData = this.oauthStateStore.consume(state);
    if (!stateData) {
      throw new HttpError(400, "INVALID_STATE", "OAuth state is missing or expired.");
    }

    const tokenPayload = await this.oauthClient.exchangeCode({
      code,
      codeVerifier: stateData.codeVerifier
    });

    const profile = await this.oauthClient.resolveUserProfile(tokenPayload);
    const tokenPair = this.#issueTokenPair({
      user: {
        sub: profile.sub,
        name: profile.name,
        email: profile.email,
        provider: "supercell"
      }
    });

    return {
      returnTo: stateData.returnTo || "/",
      ...tokenPair
    };
  }

  refreshTokens(rawRefreshToken) {
    if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
      throw new HttpError(400, "MISSING_REFRESH_TOKEN", "refreshToken is required.");
    }

    const refreshPayload = this.jwtTokenService.verifyRefreshToken(rawRefreshToken);
    if (!refreshPayload) {
      throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired.");
    }

    const nextRefreshTokenId = this.jwtTokenService.createRefreshTokenId();
    const nextRefreshToken = this.jwtTokenService.createRefreshToken(
      {
        sub: refreshPayload.sub,
        name: refreshPayload.name,
        email: refreshPayload.email,
        provider: refreshPayload.provider
      },
      refreshPayload.sid,
      nextRefreshTokenId
    );
    const nextRefreshPayload = this.jwtTokenService.verifyRefreshToken(nextRefreshToken);
    if (!nextRefreshPayload) {
      throw new HttpError(500, "TOKEN_ISSUE_FAILED", "Failed to issue refresh token.");
    }

    const rotated = this.refreshSessionStore.rotate({
      sessionId: refreshPayload.sid,
      currentTokenId: refreshPayload.jti,
      nextTokenId: nextRefreshTokenId,
      nextExpiresAtSec: nextRefreshPayload.exp
    });
    if (!rotated) {
      throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Refresh token has been rotated or revoked.");
    }

    const accessToken = this.jwtTokenService.createAccessToken(
      {
        sub: refreshPayload.sub,
        name: refreshPayload.name,
        email: refreshPayload.email,
        provider: refreshPayload.provider
      },
      refreshPayload.sid
    );

    return {
      tokenType: "Bearer",
      accessToken,
      refreshToken: nextRefreshToken,
      expiresIn: this.jwtTokenService.accessTokenTtlSec
    };
  }

  logout({ req, refreshToken }) {
    if (refreshToken) {
      const refreshPayload = this.jwtTokenService.verifyRefreshToken(refreshToken);
      if (refreshPayload && refreshPayload.sid) {
        this.refreshSessionStore.revoke(refreshPayload.sid);
      }
    }

    const accessPayload = this.jwtTokenService.getAccessPayloadFromRequest(req);
    if (accessPayload && accessPayload.sid) {
      this.refreshSessionStore.revoke(accessPayload.sid);
    }

    return {
      ok: true,
      message: "Logged out"
    };
  }

  ensureAuthenticated(req, requireLoginForApi) {
    if (!requireLoginForApi) return null;

    const accessPayload = this.jwtTokenService.getAccessPayloadFromRequest(req);
    if (!accessPayload) {
      throw new HttpError(401, "AUTH_REQUIRED", "Login is required to access this API.");
    }

    return accessPayload;
  }

  #issueTokenPair({ user }) {
    const sessionId = crypto.randomBytes(18).toString("base64url");
    const refreshTokenId = this.jwtTokenService.createRefreshTokenId();

    const accessToken = this.jwtTokenService.createAccessToken(user, sessionId);
    const refreshToken = this.jwtTokenService.createRefreshToken(user, sessionId, refreshTokenId);
    const refreshPayload = this.jwtTokenService.verifyRefreshToken(refreshToken);
    if (!refreshPayload) {
      throw new HttpError(500, "TOKEN_ISSUE_FAILED", "Failed to issue refresh token.");
    }

    this.refreshSessionStore.createOrReplaceSession({
      sessionId,
      tokenId: refreshTokenId,
      expiresAtSec: refreshPayload.exp
    });

    return {
      tokenType: "Bearer",
      accessToken,
      refreshToken,
      expiresIn: this.jwtTokenService.accessTokenTtlSec
    };
  }

  #sanitizeReturnTo(returnTo) {
    if (!returnTo || typeof returnTo !== "string") return "/";
    if (!returnTo.startsWith("/")) return "/";
    if (returnTo.startsWith("//")) return "/";
    return returnTo;
  }
}

module.exports = { AuthService };
