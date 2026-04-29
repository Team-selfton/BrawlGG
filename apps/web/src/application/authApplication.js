import { fetchJson } from "../shared/apiClient.js";

export async function loadHealthState() {
  try {
    const health = await fetchJson("/api/health");
    return {
      requireLoginForApi: Boolean(health.requireLoginForApi),
      oauthEnabled: Boolean(health.oauthEnabled)
    };
  } catch {
    return {
      requireLoginForApi: false,
      oauthEnabled: false
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
  return fetchJson("/api/auth/logout", { method: "POST" });
}
