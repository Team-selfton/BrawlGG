function createGetHealthStatusUseCase({ oauthClient, requireLoginForApi, hasBrawlApiToken }) {
  return function getHealthStatus() {
    return {
      ok: true,
      service: "brawlgg",
      brawlApiTokenConfigured: hasBrawlApiToken,
      oauthEnabled: oauthClient.enabled,
      requireLoginForApi
    };
  };
}

module.exports = { createGetHealthStatusUseCase };
