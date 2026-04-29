function createGetAuthStatusUseCase({ authService }) {
  return function getAuthStatus(req) {
    return authService.getAuthStatus(req);
  };
}

module.exports = { createGetAuthStatusUseCase };
