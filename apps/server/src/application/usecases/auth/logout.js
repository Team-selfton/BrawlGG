function createLogoutUseCase() {
  return function logout() {
    return {
      ok: true,
      message: "Logged out"
    };
  };
}

module.exports = { createLogoutUseCase };
