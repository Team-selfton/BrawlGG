import { fetchJson } from "../shared/apiClient.js";
import { sanitizeTag } from "../domain/playerFormatting.js";

export async function loadPlayerOverview(rawTag) {
  const tag = sanitizeTag(rawTag);
  return fetchJson(`/api/player/${encodeURIComponent(tag)}/overview`);
}

export async function loadClub(rawTag) {
  const tag = sanitizeTag(rawTag);
  return fetchJson(`/api/club/${encodeURIComponent(tag)}`);
}

export async function loadClubMembers(rawTag) {
  const tag = sanitizeTag(rawTag);
  return fetchJson(`/api/club/${encodeURIComponent(tag)}/members`);
}

export async function loadRankings({ type, country, brawlerId, limit = 20 }) {
  const rankingType = type || "players";
  let endpoint = `/api/rankings/${rankingType}?country=${encodeURIComponent(country)}&limit=${limit}`;

  if (rankingType === "brawlers" && brawlerId) {
    endpoint += `&brawlerId=${encodeURIComponent(brawlerId)}`;
  }

  return fetchJson(endpoint);
}

export async function loadMultiPlayerOverview(rawTags) {
  return fetchJson(`/api/players/multi?tags=${encodeURIComponent(String(rawTags || ""))}`);
}

export async function loadBrawlers() {
  return fetchJson("/api/brawlers");
}

export async function loadBrawlerById(brawlerId) {
  return fetchJson(`/api/brawlers/${encodeURIComponent(brawlerId)}`);
}

export async function loadLocations(limit = 50) {
  return fetchJson(`/api/locations?limit=${encodeURIComponent(String(limit))}`);
}

export async function loadLocation(locationId) {
  return fetchJson(`/api/locations/${encodeURIComponent(locationId)}`);
}

export async function loadEvents() {
  return fetchJson("/api/events");
}

export async function loadEventRotation() {
  return fetchJson("/api/events/rotation");
}
