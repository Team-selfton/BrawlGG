function createRefreshTokensUseCase({ authService }) {
  return function refreshTokens(refreshToken) {
    return authService.refreshTokens(refreshToken);
  };
}

module.exports = { createRefreshTokensUseCase };
