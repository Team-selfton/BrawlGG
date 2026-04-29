function createGetPlayerRankingsUseCase({ gameDataService }) {
  return function getPlayerRankings(country, limit) {
    return gameDataService.getPlayerRankings(country, limit);
  };
}

module.exports = { createGetPlayerRankingsUseCase };
