const crypto = require("node:crypto");
const { HttpError } = require("../../domain/errors/HttpError");

class AuthService {
  constructor({ oauthClient, oauthStateStore, sessionTokenService }) {
    this.oauthClient = oauthClient;
    this.oauthStateStore = oauthStateStore;
    this.sessionTokenService = sessionTokenService;
  }

  getAuthStatus(req) {
    const session = this.sessionTokenService.getSessionFromRequest(req);
    return {
      authenticated: Boolean(session),
      oauthEnabled: this.oauthClient.enabled,
      user: session
        ? {
            sub: session.sub,
            name: session.name,
            email: session.email,
            provider: session.provider
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
    const sessionToken = this.sessionTokenService.createSessionToken(profile);

    return {
      sessionToken,
      returnTo: stateData.returnTo || "/"
    };
  }

  ensureAuthenticated(req, requireLoginForApi) {
    if (!requireLoginForApi) return null;

    const session = this.sessionTokenService.getSessionFromRequest(req);
    if (!session) {
      throw new HttpError(401, "AUTH_REQUIRED", "Login is required to access this API.");
    }

    return session;
  }

  #sanitizeReturnTo(returnTo) {
    if (!returnTo || typeof returnTo !== "string") return "/";
    if (!returnTo.startsWith("/")) return "/";
    if (returnTo.startsWith("//")) return "/";
    return returnTo;
  }
}

module.exports = { AuthService };
