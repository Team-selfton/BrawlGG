const { HttpError } = require("../../domain/errors/HttpError");
const { sendJson, sendRedirect, sendHtml } = require("./httpResponse");

function createApiRouter({ useCases, openApiSpec }) {
  return async function routeApi(req, reqUrl, res) {
    try {
      const pathname = reqUrl.pathname;

      if (pathname === "/api/docs") {
        return sendRedirect(res, "/docs");
      }

      if (pathname === "/api/docs/openapi.json") {
        return sendJson(res, 200, openApiSpec);
      }

      if (pathname === "/api/health") {
        return sendJson(res, 200, useCases.getHealthStatus());
      }

      if (pathname.startsWith("/api/auth/")) {
        return await handleAuthRoute(req, reqUrl, res, useCases);
      }

      if (requiresAuth(pathname)) {
        try {
          useCases.ensureAuthenticated(req);
        } catch (error) {
          if (error instanceof HttpError && error.statusCode === 401) {
            return sendJson(res, 401, {
              reason: error.reason,
              message: error.message,
              loginPath: "/api/auth/supercell/start?return_to=/"
            });
          }
          throw error;
        }
      }

      if (pathname === "/api/players/multi") {
        const multiResult = await useCases.getMultiPlayerOverview(reqUrl.searchParams.get("tags"));
        return sendJson(res, 200, multiResult);
      }

      if (pathname.startsWith("/api/player/")) {
        return await handlePlayerRoute(reqUrl, res, useCases);
      }

      if (pathname.startsWith("/api/rankings/")) {
        const rankings = await handleRankingRoute(reqUrl, useCases);
        return sendJson(res, 200, rankings);
      }

      if (pathname === "/api/brawlers") {
        const brawlers = await useCases.getBrawlers();
        return sendJson(res, 200, brawlers);
      }

      return sendJson(res, 404, { message: "API route not found." });
    } catch (error) {
      return handleError(res, error);
    }
  };
}

async function handleAuthRoute(req, reqUrl, res, useCases) {
  const pathname = reqUrl.pathname;

  if (pathname === "/api/auth/me") {
    return sendJson(res, 200, useCases.getAuthStatus(req));
  }

  if (pathname === "/api/auth/logout") {
    if (!["POST", "GET"].includes(req.method || "")) {
      return sendJson(res, 405, { message: "Method not allowed." });
    }

    const body = req.method === "POST" ? await readJsonBody(req) : {};
    const logoutResult = useCases.logout({
      req,
      refreshToken: body.refreshToken
    });
    return sendJson(res, 200, logoutResult);
  }

  if (pathname === "/api/auth/refresh") {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed." });
    }

    const body = await readJsonBody(req);
    const refreshed = useCases.refreshTokens(body.refreshToken);
    return sendJson(res, 200, refreshed);
  }

  if (pathname === "/api/auth/supercell/start") {
    const startResult = useCases.startOAuthLogin(reqUrl.searchParams.get("return_to") || "/");
    return sendRedirect(res, startResult.authorizationUrl);
  }

  if (pathname === "/api/auth/supercell/callback") {
    const callbackResult = await useCases.completeOAuthLogin({
      error: reqUrl.searchParams.get("error"),
      errorDescription: reqUrl.searchParams.get("error_description"),
      code: reqUrl.searchParams.get("code"),
      state: reqUrl.searchParams.get("state")
    });

    const html = buildOAuthCallbackPage(callbackResult);
    return sendHtml(res, 200, html);
  }

  return sendJson(res, 404, { message: "Auth route not found." });
}

async function handlePlayerRoute(reqUrl, res, useCases) {
  const parts = reqUrl.pathname.split("/").filter(Boolean);
  const rawTag = parts[2];
  const section = parts[3];

  if (section === "overview") {
    const overview = await useCases.getPlayerOverview(rawTag);
    return sendJson(res, 200, overview);
  }

  if (section === "battlelog") {
    const battlelog = await useCases.getPlayerBattlelog(rawTag);
    return sendJson(res, 200, battlelog);
  }

  if (section && !["battlelog", "overview"].includes(section)) {
    return sendJson(res, 404, { message: "API route not found." });
  }

  const playerProfile = await useCases.getPlayerProfile(rawTag);
  return sendJson(res, 200, playerProfile);
}

async function handleRankingRoute(reqUrl, useCases) {
  const pathname = reqUrl.pathname;
  const country = reqUrl.searchParams.get("country");
  const limit = reqUrl.searchParams.get("limit");

  if (pathname === "/api/rankings/players") {
    return useCases.getPlayerRankings(country, limit);
  }

  if (pathname === "/api/rankings/clubs") {
    return useCases.getClubRankings(country, limit);
  }

  if (pathname === "/api/rankings/brawlers") {
    return useCases.getBrawlerRankings(country, reqUrl.searchParams.get("brawlerId"), limit);
  }

  throw new HttpError(404, "NOT_FOUND", "Ranking route not found.");
}

function requiresAuth(pathname) {
  return (
    pathname.startsWith("/api/player") ||
    pathname.startsWith("/api/players") ||
    pathname.startsWith("/api/rankings") ||
    pathname.startsWith("/api/brawlers")
  );
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let done = false;

    function finishWithError(error) {
      if (done) return;
      done = true;
      reject(error);
    }

    function finishWithValue(value) {
      if (done) return;
      done = true;
      resolve(value);
    }

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        finishWithError(new HttpError(413, "PAYLOAD_TOO_LARGE", "Request body is too large."));
      }
    });
    req.on("end", () => {
      if (done) return;
      if (!raw) {
        finishWithValue({});
        return;
      }

      try {
        finishWithValue(JSON.parse(raw));
      } catch {
        finishWithError(new HttpError(400, "INVALID_JSON", "Request body must be valid JSON."));
      }
    });
    req.on("error", (error) => finishWithError(error));
  });
}

function buildOAuthCallbackPage(callbackResult) {
  const tokenPayload = {
    tokenType: callbackResult.tokenType,
    accessToken: callbackResult.accessToken,
    refreshToken: callbackResult.refreshToken,
    expiresIn: callbackResult.expiresIn
  };

  const serializedPayload = JSON.stringify(tokenPayload);
  const safePayloadLiteral = JSON.stringify(serializedPayload);
  const safeReturnTo = JSON.stringify(callbackResult.returnTo || "/");

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BrawlGG OAuth Complete</title>
  </head>
  <body>
    <p>로그인 처리 중입니다...</p>
    <script>
      (function () {
        var storageKey = "brawlgg_auth_tokens";
        var payload = JSON.parse(${safePayloadLiteral});
        localStorage.setItem(storageKey, JSON.stringify(payload));
        window.location.replace(${safeReturnTo});
      })();
    </script>
  </body>
</html>`;
}

function handleError(res, error) {
  if (error instanceof HttpError) {
    return sendJson(res, error.statusCode, {
      reason: error.reason,
      message: error.message,
      details: error.details || undefined
    });
  }

  return sendJson(res, 500, {
    reason: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "Unknown server error."
  });
}

module.exports = { createApiRouter };
