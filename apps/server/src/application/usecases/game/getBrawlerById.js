function createGetBrawlerByIdUseCase({ gameDataService }) {
  return function getBrawlerById(rawBrawlerId) {
    return gameDataService.getBrawlerById(rawBrawlerId);
  };
}

module.exports = { createGetBrawlerByIdUseCase };
