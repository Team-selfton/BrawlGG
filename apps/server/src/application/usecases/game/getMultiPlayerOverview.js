function createGetMultiPlayerOverviewUseCase({ gameDataService }) {
  return function getMultiPlayerOverview(rawTags) {
    return gameDataService.getMultiPlayerOverview(rawTags);
  };
}

module.exports = { createGetMultiPlayerOverviewUseCase };
