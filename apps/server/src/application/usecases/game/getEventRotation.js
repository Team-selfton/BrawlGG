function createGetEventRotationUseCase({ gameDataService }) {
  return function getEventRotation() {
    return gameDataService.getEventRotation();
  };
}

module.exports = { createGetEventRotationUseCase };
