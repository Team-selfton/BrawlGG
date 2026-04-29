const { HttpError } = require("../../domain/errors/HttpError");

class BrawlApiClient {
  constructor({ apiBaseUrl, apiToken }) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiToken = apiToken;
  }

  async getPlayer(playerTag) {
    return this.#request(`/players/%23${playerTag}`);
  }

  async getBattlelog(playerTag) {
    return this.#request(`/players/%23${playerTag}/battlelog`);
  }

  async getPlayerRankings({ country, limit }) {
    return this.#requestWithFallback([
      `/rankings/${country}/players?limit=${limit}`,
      `/locations/${country}/rankings/players?limit=${limit}`
    ]);
  }

  async getClubRankings({ country, limit }) {
    return this.#requestWithFallback([
      `/rankings/${country}/clubs?limit=${limit}`,
      `/locations/${country}/rankings/clubs?limit=${limit}`
    ]);
  }

  async getBrawlerRankings({ country, brawlerId, limit }) {
    return this.#requestWithFallback([
      `/rankings/${country}/brawlers/${brawlerId}?limit=${limit}`,
      `/locations/${country}/rankings/brawlers/${brawlerId}?limit=${limit}`
    ]);
  }

  async getBrawlers() {
    return this.#request("/brawlers");
  }

  async #request(endpoint) {
    if (!this.apiToken) {
      throw new HttpError(503, "MISSING_TOKEN", "BRAWL_API_TOKEN environment variable is not set.");
    }

    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        Accept: "application/json"
      }
    });

    const text = await response.text();
    const payload = this.#safeParseJson(text);

    if (!response.ok) {
      throw new HttpError(
        response.status,
        payload.reason || payload.error || "BRAWL_API_ERROR",
        payload.message || payload.error_description || "Failed to fetch Brawl Stars API data.",
        payload
      );
    }

    return payload;
  }

  async #requestWithFallback(endpoints) {
    let lastNotFoundError = null;

    for (const endpoint of endpoints) {
      try {
        return await this.#request(endpoint);
      } catch (error) {
        if (error instanceof HttpError && error.statusCode === 404) {
          lastNotFoundError = error;
          continue;
        }
        throw error;
      }
    }

    if (lastNotFoundError) {
      throw lastNotFoundError;
    }

    throw new HttpError(500, "BRAWL_API_ERROR", "No fallback endpoint could be resolved.");
  }

  #safeParseJson(text) {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { message: text || "Unknown response from Brawl Stars API." };
    }
  }
}

module.exports = { BrawlApiClient };
