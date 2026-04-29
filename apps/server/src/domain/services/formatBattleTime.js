function formatBattleTime(raw) {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw.split(".")[0];
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return raw;

  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day} ${hour}:${minute}:${second} UTC`;
}

module.exports = { formatBattleTime };
