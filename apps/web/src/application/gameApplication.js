import { fetchJson } from "../shared/apiClient.js";
import { sanitizeTag } from "../domain/playerFormatting.js";

export async function loadPlayerOverview(rawTag) {
  const tag = sanitizeTag(rawTag);

  const [player, battlelog] = await Promise.all([
    fetchJson(`/api/player/${encodeURIComponent(tag)}`),
    fetchJson(`/api/player/${encodeURIComponent(tag)}/battlelog`)
  ]);

  return {
    player,
    battlelog
  };
}

export async function loadRankings(country) {
  return fetchJson(`/api/rankings/players?country=${country}&limit=20`);
}
