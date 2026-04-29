function createGetPlayerProfileUseCase({ gameDataService }) {
  return function getPlayerProfile(rawTag) {
    return gameDataService.getPlayerProfile(rawTag);
  };
}

module.exports = { createGetPlayerProfileUseCase };
