const crypto = require("node:crypto");
const path = require("node:path");

function toBoolean(rawValue, fallback) {
  if (typeof rawValue !== "string") return fallback;
  return rawValue.toLowerCase() === "true";
}

function loadConfig(env = process.env) {
  const port = Number(env.PORT || 3000);
  const host = env.HOST || "127.0.0.1";
  const appBaseUrl = env.APP_BASE_URL || `http://localhost:${port}`;

  const sessionSecret =
    env.SESSION_SECRET ||
    crypto.createHash("sha256").update(`brawlgg-dev-${Date.now()}`).digest("hex");

  if (!env.SESSION_SECRET) {
    console.warn("[warn] SESSION_SECRET is not set. Development-only volatile secret is used.");
  }

  const oauth = {
    clientId: env.SUPERCELL_OAUTH_CLIENT_ID || "",
    clientSecret: env.SUPERCELL_OAUTH_CLIENT_SECRET || "",
    authorizationUrl: env.SUPERCELL_OAUTH_AUTHORIZATION_URL || "",
    tokenUrl: env.SUPERCELL_OAUTH_TOKEN_URL || "",
    userinfoUrl: env.SUPERCELL_OAUTH_USERINFO_URL || "",
    redirectUri: env.SUPERCELL_OAUTH_REDIRECT_URI || `${appBaseUrl}/api/auth/supercell/callback`,
    scope: env.SUPERCELL_OAUTH_SCOPE || "openid profile email",
    audience: env.SUPERCELL_OAUTH_AUDIENCE || "",
    stateTtlMs: Math.max(60000, Number(env.OAUTH_STATE_TTL_MS || 10 * 60 * 1000))
  };

  oauth.enabled =
    Boolean(oauth.clientId) &&
    Boolean(oauth.authorizationUrl) &&
    Boolean(oauth.tokenUrl) &&
    Boolean(oauth.redirectUri);

  return {
    server: {
      port,
      host,
      appBaseUrl,
      webRootDir: path.join(process.cwd(), "apps", "web")
    },
    brawl: {
      apiBaseUrl: env.BRAWL_API_BASE_URL || "https://api.brawlstars.com/v1",
      apiToken: env.BRAWL_API_TOKEN || ""
    },
    auth: {
      requireLoginForApi: toBoolean(env.REQUIRE_LOGIN_FOR_API || "false", false),
      cookieName: env.SESSION_COOKIE_NAME || "brawlgg_session",
      sessionTtlSec: Math.max(300, Number(env.SESSION_TTL_SEC || 60 * 60 * 24 * 7)),
      sessionSecret,
      oauth
    }
  };
}

module.exports = { loadConfig };
