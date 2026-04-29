function createGetPlayerOverviewUseCase({ gameDataService }) {
  return function getPlayerOverview(rawTag) {
    return gameDataService.getPlayerOverview(rawTag);
  };
}

module.exports = { createGetPlayerOverviewUseCase };
