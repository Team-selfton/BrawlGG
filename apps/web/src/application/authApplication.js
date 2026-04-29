import { fetchJson } from "../shared/apiClient.js";
import { clearAuthTokens, getRefreshToken } from "../shared/authTokenStore.js";

export async function loadHealthState() {
  try {
    const health = await fetchJson("/api/health");
    return {
      requireLoginForApi: Boolean(health.requireLoginForApi),
      oauthEnabled: Boolean(health.oauthEnabled),
      brawlApiTokenConfigured: Boolean(health.brawlApiTokenConfigured)
    };
  } catch {
    return {
      requireLoginForApi: false,
      oauthEnabled: false,
      brawlApiTokenConfigured: false
    };
  }
}

export async function loadAuthState() {
  const auth = await fetchJson("/api/auth/me");
  return {
    authenticated: Boolean(auth.authenticated),
    user: auth.user || null
  };
}

export function startOAuthLogin() {
  window.location.href = "/api/auth/supercell/start?return_to=/";
}

export async function logout() {
  try {
    const refreshToken = getRefreshToken();
    const response = await fetchJson("/api/auth/logout", {
      method: "POST",
      body: {
        refreshToken
      }
    });
    clearAuthTokens();
    return response;
  } catch (error) {
    clearAuthTokens();
    throw error;
  }
}
