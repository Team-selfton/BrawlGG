const { loadConfig } = require("./config/env");
const { BrawlApiClient } = require("./infrastructure/brawl/BrawlApiClient");
const { OAuthClient } = require("./infrastructure/oauth/OAuthClient");
const { MemoryOAuthStateStore } = require("./infrastructure/session/MemoryOAuthStateStore");
const { JwtTokenService } = require("./infrastructure/auth/JwtTokenService");
const { MemoryRefreshSessionStore } = require("./infrastructure/auth/MemoryRefreshSessionStore");
const { GameDataService } = require("./application/services/GameDataService");
const { AuthService } = require("./application/services/AuthService");
const { createGetHealthStatusUseCase } = require("./application/usecases/health/getHealthStatus");
const { createGetPlayerProfileUseCase } = require("./application/usecases/game/getPlayerProfile");
const { createGetPlayerBattlelogUseCase } = require("./application/usecases/game/getPlayerBattlelog");
const { createGetPlayerOverviewUseCase } = require("./application/usecases/game/getPlayerOverview");
const { createGetPlayerOverviewByIdentityUseCase } = require("./application/usecases/game/getPlayerOverviewByIdentity");
const { createGetMultiPlayerOverviewUseCase } = require("./application/usecases/game/getMultiPlayerOverview");
const { createGetPlayerRankingsUseCase } = require("./application/usecases/game/getPlayerRankings");
const { createGetClubRankingsUseCase } = require("./application/usecases/game/getClubRankings");
const { createGetBrawlerRankingsUseCase } = require("./application/usecases/game/getBrawlerRankings");
const { createGetBrawlersUseCase } = require("./application/usecases/game/getBrawlers");
const { createGetClubUseCase } = require("./application/usecases/game/getClub");
const { createGetClubMembersUseCase } = require("./application/usecases/game/getClubMembers");
const { createGetLocationsUseCase } = require("./application/usecases/game/getLocations");
const { createGetLocationUseCase } = require("./application/usecases/game/getLocation");
const { createGetEventsUseCase } = require("./application/usecases/game/getEvents");
const { createGetEventRotationUseCase } = require("./application/usecases/game/getEventRotation");
const { createGetBrawlerByIdUseCase } = require("./application/usecases/game/getBrawlerById");
const { createGetAuthStatusUseCase } = require("./application/usecases/auth/getAuthStatus");
const { createStartOAuthLoginUseCase } = require("./application/usecases/auth/startOAuthLogin");
const { createCompleteOAuthLoginUseCase } = require("./application/usecases/auth/completeOAuthLogin");
const { createRefreshTokensUseCase } = require("./application/usecases/auth/refreshTokens");
const { createEnsureAuthenticatedUseCase } = require("./application/usecases/auth/ensureAuthenticated");
const { createLogoutUseCase } = require("./application/usecases/auth/logout");
const { createApiRouter } = require("./presentation/http/apiRouter");
const { createStaticFileHandler } = require("./presentation/http/staticFileHandler");
const { createServer } = require("./presentation/http/createServer");
const { createOpenApiSpec } = require("./presentation/http/openApiSpec");

function createApp() {
  const config = loadConfig(process.env);

  const brawlApiClient = new BrawlApiClient(config.brawl);
  const oauthClient = new OAuthClient(config.auth.oauth);
  const jwtTokenService = new JwtTokenService(config.auth.jwt);
  const refreshSessionStore = new MemoryRefreshSessionStore();
  const oauthStateStore = new MemoryOAuthStateStore({ ttlMs: config.auth.oauth.stateTtlMs });

  const gameDataService = new GameDataService({ brawlApiClient });
  const authService = new AuthService({
    oauthClient,
    oauthStateStore,
    jwtTokenService,
    refreshSessionStore,
    mobileAppScheme: config.auth.mobile.appScheme
  });
  const openApiSpec = createOpenApiSpec({
    appBaseUrl: config.server.appBaseUrl,
    accessTokenTtlSec: config.auth.jwt.accessTokenTtlSec
  });

  const useCases = {
    getHealthStatus: createGetHealthStatusUseCase({
      oauthClient,
      requireLoginForApi: config.auth.requireLoginForApi,
      hasBrawlApiToken: Boolean(config.brawl.apiToken)
    }),
    getPlayerProfile: createGetPlayerProfileUseCase({ gameDataService }),
    getPlayerBattlelog: createGetPlayerBattlelogUseCase({ gameDataService }),
    getPlayerOverview: createGetPlayerOverviewUseCase({ gameDataService }),
    getPlayerOverviewByIdentity: createGetPlayerOverviewByIdentityUseCase({ gameDataService }),
    getMultiPlayerOverview: createGetMultiPlayerOverviewUseCase({ gameDataService }),
    getClub: createGetClubUseCase({ gameDataService }),
    getClubMembers: createGetClubMembersUseCase({ gameDataService }),
    getPlayerRankings: createGetPlayerRankingsUseCase({ gameDataService }),
    getClubRankings: createGetClubRankingsUseCase({ gameDataService }),
    getBrawlerRankings: createGetBrawlerRankingsUseCase({ gameDataService }),
    getBrawlers: createGetBrawlersUseCase({ gameDataService }),
    getBrawlerById: createGetBrawlerByIdUseCase({ gameDataService }),
    getLocations: createGetLocationsUseCase({ gameDataService }),
    getLocation: createGetLocationUseCase({ gameDataService }),
    getEvents: createGetEventsUseCase({ gameDataService }),
    getEventRotation: createGetEventRotationUseCase({ gameDataService }),
    getAuthStatus: createGetAuthStatusUseCase({ authService }),
    startOAuthLogin: createStartOAuthLoginUseCase({ authService }),
    completeOAuthLogin: createCompleteOAuthLoginUseCase({ authService }),
    refreshTokens: createRefreshTokensUseCase({ authService }),
    ensureAuthenticated: createEnsureAuthenticatedUseCase({
      authService,
      requireLoginForApi: config.auth.requireLoginForApi
    }),
    logout: createLogoutUseCase({ authService })
  };

  const routeApi = createApiRouter({ useCases, openApiSpec });
  const serveStatic = createStaticFileHandler({ webRootDir: config.server.webRootDir });
  const server = createServer({ routeApi, serveStatic });

  return {
    server,
    config
  };
}

module.exports = { createApp };
