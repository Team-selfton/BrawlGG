function createGetPlayerBattlelogUseCase({ gameDataService }) {
  return function getPlayerBattlelog(rawTag) {
    return gameDataService.getPlayerBattlelog(rawTag);
  };
}

module.exports = { createGetPlayerBattlelogUseCase };
