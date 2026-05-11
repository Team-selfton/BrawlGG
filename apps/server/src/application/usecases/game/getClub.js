function createGetClubUseCase({ gameDataService }) {
  return function getClub(rawTag) {
    return gameDataService.getClub(rawTag);
  };
}

module.exports = { createGetClubUseCase };
