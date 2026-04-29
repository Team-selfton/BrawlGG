export function sanitizeTag(rawTag) {
  return String(rawTag || "").trim().toUpperCase().replace(/^#/, "");
}

export function toBattleViewModel(item) {
  const battle = item.battle || {};
  const event = item.event || {};

  return {
    mode: event.mode || "unknown",
    result: battle.result || battle.rank || battle.trophyChange || "-",
    map: event.map || "Unknown Map",
    time: item.battleTimeFormatted || item.battleTime || ""
  };
}
