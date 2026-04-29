function createGetClubRankingsUseCase({ gameDataService }) {
  return function getClubRankings(country, limit) {
    return gameDataService.getClubRankings(country, limit);
  };
}

module.exports = { createGetClubRankingsUseCase };
