const STORAGE_KEY = "brawlgg_auth_tokens";

export function getAuthTokens() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      tokenType: parsed.tokenType || "Bearer",
      accessToken: parsed.accessToken || "",
      refreshToken: parsed.refreshToken || "",
      expiresIn: Number(parsed.expiresIn || 0)
    };
  } catch {
    return null;
  }
}

export function setAuthTokens(tokens) {
  if (!tokens || !tokens.accessToken || !tokens.refreshToken) return;

  const payload = {
    tokenType: tokens.tokenType || "Bearer",
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: Number(tokens.expiresIn || 0)
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearAuthTokens() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getAccessToken() {
  return getAuthTokens()?.accessToken || "";
}

export function getRefreshToken() {
  return getAuthTokens()?.refreshToken || "";
}
