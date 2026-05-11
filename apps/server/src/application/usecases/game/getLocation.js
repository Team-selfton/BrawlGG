function createGetLocationUseCase({ gameDataService }) {
  return function getLocation(locationId) {
    return gameDataService.getLocation(locationId);
  };
}

module.exports = { createGetLocationUseCase };
