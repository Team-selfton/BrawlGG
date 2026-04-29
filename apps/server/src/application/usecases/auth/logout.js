function createLogoutUseCase({ authService }) {
  return function logout(params) {
    return authService.logout(params);
  };
}

module.exports = { createLogoutUseCase };
