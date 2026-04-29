function analyzeBattlelog(items) {
  const safeItems = Array.isArray(items) ? items : [];
  const recentItems = safeItems.slice(0, 10);

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let trophyDelta = 0;

  const modeCount = {};

  for (const item of recentItems) {
    const battle = item && item.battle ? item.battle : {};
    const event = item && item.event ? item.event : {};

    const outcome = classifyBattleOutcome(battle);
    if (outcome === "win") wins += 1;
    if (outcome === "loss") losses += 1;
    if (outcome === "draw") draws += 1;

    const trophyChange = Number(battle.trophyChange);
    if (Number.isFinite(trophyChange)) {
      trophyDelta += trophyChange;
    }

    const mode = event.mode || "UNKNOWN";
    modeCount[mode] = (modeCount[mode] || 0) + 1;
  }

  const decidedMatches = wins + losses;
  const winRate = decidedMatches > 0 ? Math.round((wins / decidedMatches) * 100) : 0;
  const mostPlayedMode = Object.keys(modeCount).reduce(
    (best, mode) => {
      const count = modeCount[mode];
      if (count > best.count) {
        return { mode, count };
      }
      return best;
    },
    { mode: "-", count: 0 }
  );

  return {
    sampleSize: recentItems.length,
    wins,
    losses,
    draws,
    winRate,
    trophyDelta,
    mostPlayedMode: mostPlayedMode.mode
  };
}

function classifyBattleOutcome(battle) {
  const rawResult = String(battle.result || "").toLowerCase();
  if (rawResult === "victory") return "win";
  if (rawResult === "defeat") return "loss";
  if (rawResult === "draw") return "draw";

  const trophyChange = Number(battle.trophyChange);
  if (Number.isFinite(trophyChange)) {
    if (trophyChange > 0) return "win";
    if (trophyChange < 0) return "loss";
    return "draw";
  }

  const rank = Number(battle.rank);
  if (Number.isFinite(rank) && rank > 0) {
    return rank <= 4 ? "win" : "loss";
  }

  return "draw";
}

module.exports = { analyzeBattlelog };
