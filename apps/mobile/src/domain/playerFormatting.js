export function sanitizeTag(rawTag) {
  return String(rawTag || "")
    .trim()
    .toUpperCase()
    .replace(/^#/, "");
}

export function toBattleViewModel(item) {
  const battle = item.battle || {};
  const event = item.event || {};
  const trophyChange = Number(battle.trophyChange);

  let result = battle.result || "-";
  if (!battle.result && Number.isFinite(Number(battle.rank))) {
    result = `rank ${battle.rank}`;
  }

  if (!battle.result && !Number.isFinite(Number(battle.rank)) && Number.isFinite(trophyChange)) {
    result = trophyChange > 0 ? `+${trophyChange}` : `${trophyChange}`;
  }

  return {
    mode: event.mode || "unknown",
    result,
    map: event.map || "Unknown Map",
    time: item.battleTimeFormatted || item.battleTime || ""
  };
}

export function toCompactPlayerStats(overview) {
  const player = overview?.player || {};
  const insights = overview?.insights || {};
  const topBrawlers = Array.isArray(overview?.topBrawlers) ? overview.topBrawlers.slice(0, 6) : [];
  const battlelogItems = Array.isArray(overview?.battlelog?.items)
    ? overview.battlelog.items.slice(0, 8).map(toBattleViewModel)
    : [];

  return {
    player,
    insights,
    topBrawlers,
    battlelogItems
  };
}
