function createGetPlayerOverviewByIdentityUseCase({ gameDataService }) {
  return function getPlayerOverviewByIdentity(rawName, rawTag) {
    return gameDataService.getPlayerOverviewByIdentity(rawName, rawTag);
  };
}

module.exports = { createGetPlayerOverviewByIdentityUseCase };
