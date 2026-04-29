const { HttpError } = require("../../domain/errors/HttpError");
const { normalizeTag } = require("../../domain/services/normalizeTag");
const { formatBattleTime } = require("../../domain/services/formatBattleTime");
const { sanitizeCountryCode } = require("../../domain/services/sanitizeCountryCode");

class GameDataService {
  constructor({ brawlApiClient }) {
    this.brawlApiClient = brawlApiClient;
  }

  async getPlayerProfile(rawTag) {
    const tag = normalizeTag(rawTag);
    if (!tag) {
      throw new HttpError(400, "INVALID_TAG", "Player tag is missing or invalid.");
    }

    return this.brawlApiClient.getPlayer(tag);
  }

  async getPlayerBattlelog(rawTag) {
    const tag = normalizeTag(rawTag);
    if (!tag) {
      throw new HttpError(400, "INVALID_TAG", "Player tag is missing or invalid.");
    }

    const payload = await this.brawlApiClient.getBattlelog(tag);
    const items = Array.isArray(payload.items)
      ? payload.items.map((item) => ({
          ...item,
          battleTimeFormatted: formatBattleTime(item.battleTime)
        }))
      : [];

    return { items };
  }

  async getPlayerRankings(rawCountry, rawLimit) {
    const country = sanitizeCountryCode(rawCountry);
    const limit = Math.max(5, Math.min(50, Number(rawLimit || 20)));

    return this.brawlApiClient.getPlayerRankings({ country, limit });
  }
}

module.exports = { GameDataService };
