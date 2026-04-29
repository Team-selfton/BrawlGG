function createGetHealthStatusUseCase({ oauthClient, requireLoginForApi }) {
  return function getHealthStatus() {
    return {
      ok: true,
      service: "brawlgg",
      oauthEnabled: oauthClient.enabled,
      requireLoginForApi
    };
  };
}

module.exports = { createGetHealthStatusUseCase };
