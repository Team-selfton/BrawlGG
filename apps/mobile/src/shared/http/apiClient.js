import { getApiBaseUrl } from "../config/runtimeConfig";
import { clearAuthTokens, getAuthTokens, setAuthTokens } from "../storage/tokenStore";

export async function fetchJson(pathname, options = {}) {
  return sendRequest(pathname, options, true);
}

async function sendRequest(pathname, options, allowRefreshRetry) {
  const requestOptions = buildRequestOptions(options);
  const tokens = await getAuthTokens();

  if (tokens?.accessToken && !requestOptions.headers.has("Authorization")) {
    requestOptions.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
  }

  const url = buildUrl(pathname);
  const response = await fetch(url, requestOptions);
  const body = await tryParseJson(response);

  if (response.status === 401 && allowRefreshRetry && !pathname.startsWith("/api/auth/refresh")) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      return sendRequest(pathname, options, false);
    }
  }

  if (!response.ok) {
    const message =
      response.status === 401
        ? "로그인이 필요합니다."
        : body.message || body.error || "요청에 실패했습니다.";

    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

function buildUrl(pathname) {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${pathname}`;
}

function buildRequestOptions(options) {
  const headers = new Headers(options.headers || {});
  let body = options.body;

  if (body && typeof body === "object" && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  return {
    ...options,
    headers,
    body
  };
}

async function tryRefreshTokens() {
  const tokens = await getAuthTokens();
  if (!tokens?.refreshToken) return false;

  try {
    const response = await fetch(buildUrl("/api/auth/refresh"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken: tokens.refreshToken })
    });

    if (!response.ok) {
      await clearAuthTokens();
      return false;
    }

    const refreshed = await response.json();
    const stored = await setAuthTokens(refreshed);
    return Boolean(stored?.accessToken && stored?.refreshToken);
  } catch {
    await clearAuthTokens();
    return false;
  }
}

async function tryParseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
