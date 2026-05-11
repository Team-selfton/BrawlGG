import * as ExpoLinking from "expo-linking";
import { fetchJson } from "../shared/http/apiClient";
import { clearAuthTokens, getAuthTokens, setAuthTokens } from "../shared/storage/tokenStore";
import { getApiBaseUrl } from "../shared/config/runtimeConfig";

const MOBILE_AUTH_CALLBACK = "brawlgg://auth-callback";

export async function loadAuthStatus() {
  return fetchJson("/api/auth/me");
}

export async function logout() {
  const tokens = await getAuthTokens();

  try {
    await fetchJson("/api/auth/logout", {
      method: "POST",
      body: { refreshToken: tokens?.refreshToken || "" }
    });
  } finally {
    await clearAuthTokens();
  }
}

export async function startOAuthLogin() {
  const baseUrl = getApiBaseUrl();
  const returnTo = encodeURIComponent(MOBILE_AUTH_CALLBACK);
  const loginUrl = `${baseUrl}/api/auth/supercell/start?return_to=${returnTo}`;

  await ExpoLinking.openURL(loginUrl);
}

export async function applyTokensFromDeepLink(url) {
  const tokenPayload = parseTokensFromAuthUrl(url);
  if (!tokenPayload) return false;

  await setAuthTokens(tokenPayload);
  return true;
}

export function parseTokensFromAuthUrl(url) {
  const rawUrl = String(url || "");
  if (!rawUrl.startsWith("brawlgg://auth-callback")) {
    return null;
  }

  const queryIndex = rawUrl.indexOf("?");
  if (queryIndex < 0) return null;

  const params = new URLSearchParams(rawUrl.slice(queryIndex + 1));

  const accessToken = params.get("accessToken") || "";
  const refreshToken = params.get("refreshToken") || "";

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    tokenType: params.get("tokenType") || "Bearer",
    accessToken,
    refreshToken,
    expiresIn: Number(params.get("expiresIn") || 0)
  };
}
