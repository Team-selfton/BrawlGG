const { HttpError } = require("../../domain/errors/HttpError");
const { normalizeTag } = require("../../domain/services/normalizeTag");
const { formatBattleTime } = require("../../domain/services/formatBattleTime");
const { sanitizeCountryCode } = require("../../domain/services/sanitizeCountryCode");
const { parsePlayerTags } = require("../../domain/services/parsePlayerTags");
const { analyzeBattlelog } = require("../../domain/services/analyzeBattlelog");

class GameDataService {
  constructor({ brawlApiClient }) {
    this.brawlApiClient = brawlApiClient;
  }

  async getPlayerProfile(rawTag) {
    const tag = this.#resolveTag(rawTag);
    return this.brawlApiClient.getPlayer(tag);
  }

  async getPlayerBattlelog(rawTag) {
    const tag = this.#resolveTag(rawTag);
    const payload = await this.brawlApiClient.getBattlelog(tag);
    const items = this.#formatBattlelogItems(payload);

    return { items };
  }

  async getPlayerOverview(rawTag) {
    const tag = this.#resolveTag(rawTag);
    const [player, battlelogPayload] = await Promise.all([
      this.brawlApiClient.getPlayer(tag),
      this.brawlApiClient.getBattlelog(tag)
    ]);
    const battlelogItems = this.#formatBattlelogItems(battlelogPayload);
    const insights = analyzeBattlelog(battlelogItems);
    const topBrawlers = summarizeTopBrawlers(player.brawlers);

    return {
      player,
      battlelog: { items: battlelogItems },
      insights,
      topBrawlers
    };
  }

  async getMultiPlayerOverview(rawTags) {
    const tags = parsePlayerTags(rawTags, 10);
    if (!tags.length) {
      throw new HttpError(
        400,
        "INVALID_TAG_LIST",
        "Please provide at least one valid player tag. You can separate multiple tags with commas."
      );
    }

    const items = await Promise.all(tags.map((tag) => this.#loadSingleMultiOverview(tag)));
    const successCount = items.filter((item) => item.ok).length;
    const failedCount = items.length - successCount;

    return {
      tags: tags.map((tag) => `#${tag}`),
      successCount,
      failedCount,
      items
    };
  }

  async getPlayerRankings(rawCountry, rawLimit) {
    const country = sanitizeCountryCode(rawCountry);
    const limit = parseLimit(rawLimit, 20);

    return this.brawlApiClient.getPlayerRankings({ country, limit });
  }

  async getClubRankings(rawCountry, rawLimit) {
    const country = sanitizeCountryCode(rawCountry);
    const limit = parseLimit(rawLimit, 20);

    return this.brawlApiClient.getClubRankings({ country, limit });
  }

  async getBrawlerRankings(rawCountry, rawBrawlerId, rawLimit) {
    const country = sanitizeCountryCode(rawCountry);
    const limit = parseLimit(rawLimit, 20);
    const brawlerId = Number(rawBrawlerId);

    if (!Number.isFinite(brawlerId) || brawlerId <= 0) {
      throw new HttpError(400, "INVALID_BRAWLER_ID", "A valid brawlerId query parameter is required.");
    }

    return this.brawlApiClient.getBrawlerRankings({ country, brawlerId, limit });
  }

  async getBrawlers() {
    const payload = await this.brawlApiClient.getBrawlers();
    const items = Array.isArray(payload.items) ? payload.items : [];

    return {
      items: items
        .map((brawler) => ({
          id: brawler.id,
          name: brawler.name,
          starPowers: Array.isArray(brawler.starPowers) ? brawler.starPowers : []
        }))
        .sort((left, right) => String(left.name).localeCompare(String(right.name)))
    };
  }

  #resolveTag(rawTag) {
    const tag = normalizeTag(rawTag);
    if (!tag) {
      throw new HttpError(400, "INVALID_TAG", "Player tag is missing or invalid.");
    }

    return tag;
  }

  #formatBattlelogItems(payload) {
    return Array.isArray(payload.items)
      ? payload.items.map((item) => ({
          ...item,
          battleTimeFormatted: formatBattleTime(item.battleTime)
        }))
      : [];
  }

  async #loadSingleMultiOverview(tag) {
    try {
      const [player, battlelogPayload] = await Promise.all([
        this.brawlApiClient.getPlayer(tag),
        this.brawlApiClient.getBattlelog(tag)
      ]);
      const battlelogItems = this.#formatBattlelogItems(battlelogPayload);
      const insights = analyzeBattlelog(battlelogItems);

      return {
        ok: true,
        tag: player.tag || `#${tag}`,
        player: {
          name: player.name,
          tag: player.tag || `#${tag}`,
          trophies: player.trophies,
          highestTrophies: player.highestTrophies,
          expLevel: player.expLevel
        },
        insights
      };
    } catch (error) {
      return {
        ok: false,
        tag: `#${tag}`,
        error: normalizeError(error)
      };
    }
  }
}

function parseLimit(rawLimit, fallback = 20) {
  const parsed = Number(rawLimit);
  const base = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(5, Math.min(50, base));
}

function summarizeTopBrawlers(brawlers) {
  const items = Array.isArray(brawlers) ? brawlers : [];

  return items
    .slice()
    .sort((left, right) => Number(right.trophies || 0) - Number(left.trophies || 0))
    .slice(0, 8)
    .map((brawler) => ({
      id: brawler.id,
      name: brawler.name,
      trophies: brawler.trophies,
      highestTrophies: brawler.highestTrophies,
      power: brawler.power,
      rank: brawler.rank
    }));
}

function normalizeError(error) {
  if (error instanceof HttpError) {
    return {
      statusCode: error.statusCode,
      reason: error.reason,
      message: error.message
    };
  }

  return {
    statusCode: 500,
    reason: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "Unknown error"
  };
}

module.exports = { GameDataService };
