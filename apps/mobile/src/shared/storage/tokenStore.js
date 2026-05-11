import * as SecureStore from "expo-secure-store";

const TOKENS_KEY = "brawlgg_mobile_auth_tokens";

let cachedTokens = null;
let loaded = false;

function normalizeTokens(tokens) {
  if (!tokens || typeof tokens !== "object") return null;

  if (!tokens.accessToken || !tokens.refreshToken) return null;

  return {
    tokenType: tokens.tokenType || "Bearer",
    accessToken: String(tokens.accessToken),
    refreshToken: String(tokens.refreshToken),
    expiresIn: Number(tokens.expiresIn || 0)
  };
}

export async function getAuthTokens() {
  if (loaded) {
    return cachedTokens;
  }

  try {
    const raw = await SecureStore.getItemAsync(TOKENS_KEY);
    if (!raw) {
      cachedTokens = null;
      loaded = true;
      return null;
    }

    cachedTokens = normalizeTokens(JSON.parse(raw));
    loaded = true;
    return cachedTokens;
  } catch {
    cachedTokens = null;
    loaded = true;
    return null;
  }
}

export async function setAuthTokens(tokens) {
  const normalized = normalizeTokens(tokens);
  if (!normalized) return null;

  cachedTokens = normalized;
  loaded = true;
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(normalized));

  return normalized;
}

export async function clearAuthTokens() {
  cachedTokens = null;
  loaded = true;
  await SecureStore.deleteItemAsync(TOKENS_KEY);
}
