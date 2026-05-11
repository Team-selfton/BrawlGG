function createGetClubMembersUseCase({ gameDataService }) {
  return function getClubMembers(rawTag) {
    return gameDataService.getClubMembers(rawTag);
  };
}

module.exports = { createGetClubMembersUseCase };
