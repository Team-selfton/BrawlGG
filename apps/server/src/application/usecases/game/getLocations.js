function createGetLocationsUseCase({ gameDataService }) {
  return function getLocations(limit) {
    return gameDataService.getLocations(limit);
  };
}

module.exports = { createGetLocationsUseCase };
