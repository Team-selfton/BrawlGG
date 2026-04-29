function createGetBrawlerRankingsUseCase({ gameDataService }) {
  return function getBrawlerRankings(country, brawlerId, limit) {
    return gameDataService.getBrawlerRankings(country, brawlerId, limit);
  };
}

module.exports = { createGetBrawlerRankingsUseCase };
