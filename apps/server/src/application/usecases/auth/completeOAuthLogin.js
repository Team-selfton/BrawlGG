function createCompleteOAuthLoginUseCase({ authService }) {
  return function completeOAuthLogin(params) {
    return authService.completeOAuthLogin(params);
  };
}

module.exports = { createCompleteOAuthLoginUseCase };
