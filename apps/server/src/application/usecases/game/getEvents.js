function createGetEventsUseCase({ gameDataService }) {
  return function getEvents() {
    return gameDataService.getEvents();
  };
}

module.exports = { createGetEventsUseCase };
