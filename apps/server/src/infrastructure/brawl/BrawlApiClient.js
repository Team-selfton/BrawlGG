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
    return this.#request(`/rankings/${country}/players?limit=${limit}`);
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

  #safeParseJson(text) {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { message: text || "Unknown response from Brawl Stars API." };
    }
  }
}

module.exports = { BrawlApiClient };
