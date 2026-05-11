import { sanitizeTag } from "../domain/playerFormatting";
import { fetchJson } from "../shared/http/apiClient";

export async function loadPlayerOverview(rawTag) {
  const tag = sanitizeTag(rawTag);
  return fetchJson(`/api/player/${encodeURIComponent(tag)}/overview`);
}

export async function loadRankings({ type, country, brawlerId, limit = 20 }) {
  const rankingType = type || "players";
  let endpoint = `/api/rankings/${rankingType}?country=${encodeURIComponent(country)}&limit=${limit}`;

  if (rankingType === "brawlers" && brawlerId) {
    endpoint += `&brawlerId=${encodeURIComponent(brawlerId)}`;
  }

  return fetchJson(endpoint);
}

export async function loadClub(rawClubTag) {
  const tag = sanitizeTag(rawClubTag);
  return fetchJson(`/api/club/${encodeURIComponent(tag)}`);
}

export async function loadClubMembers(rawClubTag) {
  const tag = sanitizeTag(rawClubTag);
  return fetchJson(`/api/club/${encodeURIComponent(tag)}/members`);
}

export async function loadEventRotation() {
  return fetchJson("/api/events/rotation");
}

export async function loadHealth() {
  return fetchJson("/api/health");
}
