function createStartOAuthLoginUseCase({ authService }) {
  return function startOAuthLogin(returnTo) {
    return authService.startOAuthLogin(returnTo);
  };
}

module.exports = { createStartOAuthLoginUseCase };
