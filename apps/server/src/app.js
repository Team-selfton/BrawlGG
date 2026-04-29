const { loadConfig } = require("./config/env");
const { BrawlApiClient } = require("./infrastructure/brawl/BrawlApiClient");
const { OAuthClient } = require("./infrastructure/oauth/OAuthClient");
const { SessionTokenService } = require("./infrastructure/session/SessionTokenService");
const { MemoryOAuthStateStore } = require("./infrastructure/session/MemoryOAuthStateStore");
const { GameDataService } = require("./application/services/GameDataService");
const { AuthService } = require("./application/services/AuthService");
const { createGetHealthStatusUseCase } = require("./application/usecases/health/getHealthStatus");
const { createGetPlayerProfileUseCase } = require("./application/usecases/game/getPlayerProfile");
const { createGetPlayerBattlelogUseCase } = require("./application/usecases/game/getPlayerBattlelog");
const { createGetPlayerOverviewUseCase } = require("./application/usecases/game/getPlayerOverview");
const { createGetMultiPlayerOverviewUseCase } = require("./application/usecases/game/getMultiPlayerOverview");
const { createGetPlayerRankingsUseCase } = require("./application/usecases/game/getPlayerRankings");
const { createGetClubRankingsUseCase } = require("./application/usecases/game/getClubRankings");
const { createGetBrawlerRankingsUseCase } = require("./application/usecases/game/getBrawlerRankings");
const { createGetBrawlersUseCase } = require("./application/usecases/game/getBrawlers");
const { createGetAuthStatusUseCase } = require("./application/usecases/auth/getAuthStatus");
const { createStartOAuthLoginUseCase } = require("./application/usecases/auth/startOAuthLogin");
const { createCompleteOAuthLoginUseCase } = require("./application/usecases/auth/completeOAuthLogin");
const { createEnsureAuthenticatedUseCase } = require("./application/usecases/auth/ensureAuthenticated");
const { createLogoutUseCase } = require("./application/usecases/auth/logout");
const { createApiRouter } = require("./presentation/http/apiRouter");
const { createStaticFileHandler } = require("./presentation/http/staticFileHandler");
const { createServer } = require("./presentation/http/createServer");

function createApp() {
  const config = loadConfig(process.env);

  const brawlApiClient = new BrawlApiClient(config.brawl);
  const oauthClient = new OAuthClient(config.auth.oauth);
  const sessionTokenService = new SessionTokenService({
    sessionSecret: config.auth.sessionSecret,
    sessionTtlSec: config.auth.sessionTtlSec,
    cookieName: config.auth.cookieName
  });
  const oauthStateStore = new MemoryOAuthStateStore({ ttlMs: config.auth.oauth.stateTtlMs });

  const gameDataService = new GameDataService({ brawlApiClient });
  const authService = new AuthService({ oauthClient, oauthStateStore, sessionTokenService });

  const useCases = {
    getHealthStatus: createGetHealthStatusUseCase({
      oauthClient,
      requireLoginForApi: config.auth.requireLoginForApi,
      hasBrawlApiToken: Boolean(config.brawl.apiToken)
    }),
    getPlayerProfile: createGetPlayerProfileUseCase({ gameDataService }),
    getPlayerBattlelog: createGetPlayerBattlelogUseCase({ gameDataService }),
    getPlayerOverview: createGetPlayerOverviewUseCase({ gameDataService }),
    getMultiPlayerOverview: createGetMultiPlayerOverviewUseCase({ gameDataService }),
    getPlayerRankings: createGetPlayerRankingsUseCase({ gameDataService }),
    getClubRankings: createGetClubRankingsUseCase({ gameDataService }),
    getBrawlerRankings: createGetBrawlerRankingsUseCase({ gameDataService }),
    getBrawlers: createGetBrawlersUseCase({ gameDataService }),
    getAuthStatus: createGetAuthStatusUseCase({ authService }),
    startOAuthLogin: createStartOAuthLoginUseCase({ authService }),
    completeOAuthLogin: createCompleteOAuthLoginUseCase({ authService }),
    ensureAuthenticated: createEnsureAuthenticatedUseCase({
      authService,
      requireLoginForApi: config.auth.requireLoginForApi
    }),
    logout: createLogoutUseCase()
  };

  const routeApi = createApiRouter({ useCases, sessionTokenService });
  const serveStatic = createStaticFileHandler({ webRootDir: config.server.webRootDir });
  const server = createServer({ routeApi, serveStatic });

  return {
    server,
    config
  };
}

module.exports = { createApp };
