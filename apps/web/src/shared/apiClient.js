import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens
} from "./authTokenStore.js";

export async function fetchJson(url, options = {}) {
  return sendRequest(url, options, true);
}

async function sendRequest(url, options, allowRefreshRetry) {
  const requestOptions = buildRequestOptions(options);
  injectAuthorizationHeader(requestOptions.headers);

  const response = await fetch(url, requestOptions);
  const body = await tryParseJson(response);

  if (response.status === 401 && allowRefreshRetry && !isAuthRefreshRequest(url)) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      return sendRequest(url, options, false);
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

function buildRequestOptions(options) {
  const headers = new Headers(options.headers || {});
  let body = options.body;

  if (body && typeof body === "object" && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  return {
    ...options,
    credentials: "omit",
    headers,
    body
  };
}

function injectAuthorizationHeader(headers) {
  const accessToken = getAccessToken();
  if (!accessToken) return;
  if (headers.has("Authorization")) return;

  headers.set("Authorization", `Bearer ${accessToken}`);
}

async function tryRefreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      clearAuthTokens();
      return false;
    }

    const tokens = await response.json();
    if (!tokens.accessToken || !tokens.refreshToken) {
      clearAuthTokens();
      return false;
    }

    setAuthTokens(tokens);
    return true;
  } catch {
    clearAuthTokens();
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

function isAuthRefreshRequest(url) {
  return typeof url === "string" && url.startsWith("/api/auth/refresh");
}
