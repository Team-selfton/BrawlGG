function createEnsureAuthenticatedUseCase({ authService, requireLoginForApi }) {
  return function ensureAuthenticated(req) {
    return authService.ensureAuthenticated(req, requireLoginForApi);
  };
}

module.exports = { createEnsureAuthenticatedUseCase };
