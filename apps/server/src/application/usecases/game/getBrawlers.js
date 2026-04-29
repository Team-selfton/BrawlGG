function createGetBrawlersUseCase({ gameDataService }) {
  return function getBrawlers() {
    return gameDataService.getBrawlers();
  };
}

module.exports = { createGetBrawlersUseCase };
